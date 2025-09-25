import { UploadResult } from '../types/upload-result.type';

export interface FileStorage {
  uploadBuffer(
    file: Express.Multer.File,
    opts?: Record<string, any>,
  ): Promise<UploadResult>;
  deleteByPublicId(publicId: string): Promise<void>;
}
