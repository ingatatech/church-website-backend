import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageController } from './storage.controller';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { JwtAuthGuard } from '../../app/modules/auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../app/modules/auth/admin-role.guard';
import { MediaAsset } from './entities/media-asset.entity';
import { ContentRecord } from '../../app/modules/content/content.entity';
import { ChurchEvent } from '../../app/modules/events/entities/church-event.entity';
import { Ministry } from '../../app/modules/ministries/entities/ministry.entity';
import { Sermon } from '../../app/modules/sermons/entities/sermon.entity';
import { Speaker } from '../../app/modules/sermons/entities/speaker.entity';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      MediaAsset,
      ContentRecord,
      ChurchEvent,
      Sermon,
      Ministry,
      Speaker,
    ]),
  ],
  controllers: [StorageController],
  providers: [CloudinaryStorageService, JwtAuthGuard, AdminRoleGuard],
  exports: [CloudinaryStorageService],
})
export class StorageModule {}
