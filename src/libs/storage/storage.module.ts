import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageController } from './storage.controller';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { JwtAuthGuard } from '../../app/modules/auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../app/modules/auth/admin-role.guard';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [CloudinaryStorageService, JwtAuthGuard, AdminRoleGuard],
  exports: [CloudinaryStorageService],
})
export class StorageModule {}
