import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageController } from './storage.controller';
import { CloudinaryStorageService } from './cloudinary-storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [CloudinaryStorageService],
})
export class StorageModule {}
