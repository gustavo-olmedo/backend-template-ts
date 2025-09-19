import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

import { FileStorage } from './interfaces/file-storage.interface';
import { UploadResult } from './types/upload-result.type';

@Injectable()
export class LocalStorageService implements FileStorage {
  private root = process.env.UPLOADS_ROOT ?? join(process.cwd(), 'uploads');
  private subdir = process.env.UPLOADS_AVATAR_DIR ?? 'avatars';
  private serveBase =
    process.env.PUBLIC_BASE_URL ?? // e.g. http://localhost:3000
    ''; // empty -> return path-only like /uploads/avatars/xxx.png

  private async ensureDir() {
    const dir = join(this.root, this.subdir);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async uploadBuffer(file: Express.Multer.File): Promise<UploadResult> {
    const dir = await this.ensureDir();
    // Keep extension if present; fall back to .bin
    const ext =
      extname(file.originalname || '') ||
      this.extFromMime(file.mimetype) ||
      '.bin';
    const filename = `${randomUUID()}${ext}`;
    const fullPath = join(dir, filename);
    await fs.writeFile(fullPath, file.buffer);

    const publicPath = `/uploads/${this.subdir}/${filename}`;
    const url = this.serveBase ? `${this.serveBase}${publicPath}` : publicPath;

    return { url, publicId: filename };
  }

  async deleteByPublicId(publicId: string): Promise<void> {
    try {
      const fullPath = join(this.root, this.subdir, publicId);
      await fs.unlink(fullPath);
    } catch {
      // ignore errors (file already gone, etc.)
    }
  }

  private extFromMime(mime: string): string | undefined {
    switch (mime) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/gif':
        return '.gif';
      case 'image/webp':
        return '.webp';
      default:
        return;
    }
  }
}
