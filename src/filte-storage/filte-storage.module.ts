import { Module, Provider } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { CloudinaryStorageService } from './cloudinary.service';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

const StorageProvider: Provider = {
  provide: FILE_STORAGE,
  useClass:
    process.env.FILE_STORAGE_DRIVER === 'cloudinary' ||
    process.env.NODE_ENV === 'production'
      ? CloudinaryStorageService
      : LocalStorageService,
};

@Module({
  providers: [StorageProvider, LocalStorageService, CloudinaryStorageService],
  exports: [StorageProvider],
})
export class FileStorageModule {}
