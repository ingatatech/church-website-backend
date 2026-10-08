import {
  BadRequestException,
  Controller,
  Get,
  Post,
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
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { ApiResponseDto } from '../../helpers/message/api.response';

@ApiTags('Media storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_request, file, callback) =>
        callback(
          null,
          /^(image\/(jpeg|png|webp|gif)|audio\/(mpeg|wav|ogg)|video\/(mp4|webm)|application\/pdf)$/.test(
            file.mimetype,
          ),
        ),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload an image, audio, video, or PDF resource (administrator)',
  })
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Upload a supported media file');
    return this.storage
      .upload(file)
      .then((result) =>
        ApiResponseDto.created('Media uploaded successfully.', result),
      );
  }
}
