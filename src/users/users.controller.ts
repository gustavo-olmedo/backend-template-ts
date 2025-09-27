import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as bcrypt from 'bcryptjs';
import { User } from './models/user.entity';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth/auth.guard';
import { UserCreateDto } from './dtos/user-create.dto';
import { UserUpdateDto } from './dtos/user-update.dto';
import { AuthService } from '../auth/auth.service';
import { HasPermission } from '../permissions/has-permission.decorator';
import { UserUpdateInfoDto } from './dtos/user-update-info.dto';
import { Throttle } from '@nestjs/throttler';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { FileStorage } from 'src/file-storage/interfaces/file-storage.interface';
import { FILE_STORAGE } from 'src/file-storage/file-storage.module';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { PasswordTokenService } from 'src/auth/password-token.service';
import { MailService } from 'src/mail/mail.service';

// Multer memory + basic filter (validators still run afterwards)
const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const multerMemory: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: (_req, file, callback) => {
    if (!allowedMimes.includes(file.mimetype)) {
      // Reject the file:
      return callback(
        new Error('Only JPEG, PNG, GIF, WEBP are allowed'),
        false,
      );
    }
    // Accept the file:
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
    private passwordTokenService: PasswordTokenService,
    private mailService: MailService,
  ) {}

  @HasPermission('users')
  @Get()
  async all(@Query('page') page: number): Promise<{
    data: Partial<User>[];
    meta: { total: number; page: number; lastPage: number };
  }> {
    return this.usersService.paginate(page, ['role']);
  }

  @HasPermission('users')
  @Post()
  async create(@Body() body: UserCreateDto) {
    const user = await this.usersService.save({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      role: { uuid: body.roleUUID },
    });

    const token = await this.passwordTokenService.issue(user, 'invite');
    const link = `${process.env.PUBLIC_FE_APP_URL}/set-password?token=${encodeURIComponent(token)}`;
    await this.mailService.sendInvite(user.email, link);

    return user;
  }

  @HasPermission('users')
  @Get(':uuid')
  async get(@Param('uuid') uuid): Promise<User | null> {
    return this.usersService.findOne({ uuid }, ['role']);
  }

  @HasPermission('users')
  @Patch('info')
  async updateInfo(@Req() request, @Body() body: UserUpdateInfoDto) {
    const uuid = await this.authService.userUUID(request);
    await this.usersService.update(uuid, {
      ...body,
    });
    return this.usersService.findOne({ uuid });
  }

  @HasPermission('users')
  @Patch('password')
  async updatePassword(
    @Req() request,
    @Body('password') password: string,
    @Body('passwordConfirm') passwordConfirm: string,
  ) {
    if (password !== passwordConfirm) {
      throw new BadRequestException('Password do not match!');
    }
    const uuid = await this.authService.userUUID(request);
    const hashedPassword = await bcrypt.hash(password, 12);
    await this.usersService.update(uuid, { password: hashedPassword });
    return this.usersService.findOne({ uuid });
  }

  @HasPermission('users')
  @Put(':uuid')
  async update(@Param('uuid') uuid: string, @Body() body: UserUpdateDto) {
    const { roleUUID, ...data } = body;
    await this.usersService.update(uuid, {
      ...data,
      role: { uuid: roleUUID },
    });

    return this.usersService.findOne({ uuid }, ['role']);
  }

  @HasPermission('users')
  @Delete(':uuid')
  async delete(@Param('uuid') uuid: string) {
    return this.usersService.delete(uuid);
  }

  @Patch('avatar')
  @Throttle({ default: { ttl: 60, limit: 5 } })
  @UseInterceptors(FileInterceptor('avatar', multerMemory))
  async updateAvatar(
    @Req() request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|gif|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Magic-number sniffing
    const ft = await fileTypeFromBuffer(file.buffer);
    if (!ft || !allowedMimes.includes(ft.mime)) {
      throw new BadRequestException('Unsupported or invalid image file.');
    }

    // Sharp checks and normalization
    try {
      const meta = await sharp(file.buffer).metadata();
      if (!meta.width || !meta.height) {
        throw new BadRequestException('Invalid image.');
      }
      if (meta.width > 4000 || meta.height > 4000) {
        throw new BadRequestException('Image too large (max 4000x4000).');
      }
      //  Normalize/resize before upload to save space
      const normalized = await sharp(file.buffer)
        .resize(512, 512, { fit: 'cover' })
        .toFormat('webp', { quality: 90 })
        .toBuffer();
      file = { ...file, buffer: normalized } as Express.Multer.File;
    } catch (e) {
      console.error('sharp failed', e);
      throw new BadRequestException('Invalid image content.');
    }

    const uuid = await this.authService.userUUID(request);

    // Upload via configured storage (local for dev or cloudinary for prod)
    const uploaded = await this.fileStorage.uploadBuffer(file, {
      folder: process.env.CLOUDINARY_FOLDER ?? 'avatars', // ignored by local
      overwrite: true,
      invalidate: true,
    });

    // Persist & delete the previous one if present
    const user = await this.usersService.findOne({ uuid });
    const oldPublicId = user?.avatarPublicId;

    await this.usersService.updateAvatar(uuid, {
      url: uploaded.url,
      publicId: uploaded.publicId,
    });

    if (oldPublicId) {
      // Best-effort cleanup
      await this.fileStorage.deleteByPublicId(oldPublicId).catch(() => {});
    }

    return this.usersService.findOne({ uuid }, ['role']);
  }
}
