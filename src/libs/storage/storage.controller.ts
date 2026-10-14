import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../app/modules/auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../app/modules/auth/admin-role.guard';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { ApiResponseDto } from '../../helpers/message/api.response';

@ApiTags('Media storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('media')
export class StorageController {
  constructor(private readonly storage: CloudinaryStorageService) {}

  @Get()
  @ApiOperation({ summary: 'List recent Cloudinary media (administrator)' })
  async list() {
    return ApiResponseDto.ok(
      'Media library loaded successfully.',
      await this.storage.listRecent(),
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_request, file, callback) =>
        callback(
          null,
          /^(image\/(jpeg|png|webp|gif)|audio\/(mpeg|wav|ogg|mp3|aac|m4a|x-m4a)|video\/(mp4|webm)|application\/pdf)$/i.test(
            file.mimetype,
          ),
        ),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an image, audio, video, or PDF resource (administrator)',
  })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('purpose') purpose?: string,
  ) {
    if (!file) throw new BadRequestException('Upload a supported media file');
    if (purpose === 'image') {
      if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) {
        throw new BadRequestException('Choose a JPEG, PNG, WebP, or GIF image');
      }
      if (file.size > 15 * 1024 * 1024) {
        throw new BadRequestException('Images must be 15 MB or smaller');
      }
    }
    return this.storage
      .upload(file)
      .then((result) =>
        ApiResponseDto.created('Media uploaded successfully.', result),
      );
  }
}
