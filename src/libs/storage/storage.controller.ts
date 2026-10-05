import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../../app/modules/auth/jwt-auth.guard';

const uploadDirectory = process.env.MEDIA_UPLOAD_DIR ?? 'uploads';
if (!existsSync(uploadDirectory))
  mkdirSync(uploadDirectory, { recursive: true });

@ApiTags('Media storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class StorageController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDirectory,
        filename: (_request, file, callback) =>
          callback(
            null,
            `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
          ),
      }),
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
    return {
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
    };
  }
}
