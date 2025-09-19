import { Injectable } from '@nestjs/common';
import { v2 as Cloudinary, UploadApiOptions } from 'cloudinary';
import { FileStorage } from './interfaces/file-storage.interface';
import { UploadResult } from './types/upload-result.type';

@Injectable()
export class CloudinaryStorageService implements FileStorage {
  constructor() {
    Cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
      api_key: process.env.CLOUDINARY_API_KEY!,
      api_secret: process.env.CLOUDINARY_API_SECRET!,
      secure: true,
    });
  }

  async uploadBuffer(
    file: Express.Multer.File,
    opts: UploadApiOptions = {},
  ): Promise<UploadResult> {
    const folder = process.env.CLOUDINARY_FOLDER ?? 'avatars';
    return new Promise((resolve, reject) => {
      const upload = Cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', ...opts },
        (err, result) => {
          if (err || !result) return reject(err || new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      upload.end(file.buffer);
    });
  }

  async deleteByPublicId(publicId: string): Promise<void> {
    await Cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }
}
