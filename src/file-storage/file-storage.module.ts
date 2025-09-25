import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { LocalStorageService } from './local-storage.service';
import { CloudinaryStorageService } from './cloudinary.service';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorageService,
    CloudinaryStorageService,
    {
      provide: FILE_STORAGE,
      inject: [ConfigService, CloudinaryStorageService, LocalStorageService],
      useFactory: (
        cfg: ConfigService,
        cloud: CloudinaryStorageService,
        local: LocalStorageService,
      ) => {
        const driver = (
          cfg.get<string>('FILE_STORAGE_DRIVER') || ''
        ).toLowerCase();
        const isProd =
          (cfg.get<string>('NODE_ENV') || '').toLowerCase() === 'production';
        const impl = driver === 'cloudinary' || isProd ? cloud : local;
        return impl;
      },
    },
  ],
  exports: [FILE_STORAGE],
})
export class FileStorageModule {}
