import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
    if (file.mimetype.startsWith('image/') && file.size > 15 * 1024 * 1024) {
      throw new BadRequestException('Images must be 15 MB or smaller');
    }
    if (!hasExpectedFileSignature(file)) {
      throw new BadRequestException(
        'The file contents do not match a supported image, audio, video, or PDF format.',
      );
    }
    return this.storage
      .upload(file, purpose)
      .then((result) =>
        ApiResponseDto.created('Media uploaded successfully.', result),
      );
  }

  @Patch(':id/alt-text')
  @ApiOperation({
    summary: 'Update accessible alternative text for a media asset (administrator)',
  })
  async updateAltText(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('altText') altText: string,
  ) {
    return ApiResponseDto.ok(
      'Media alternative text updated successfully.',
      await this.storage.updateAltText(id, altText),
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an unreferenced Cloudinary media asset (administrator)',
  })
  async deleteMedia(@Param('id', ParseUUIDPipe) id: string) {
    return ApiResponseDto.ok(
      'Media deleted successfully.',
      await this.storage.deleteAsset(id),
    );
  }
}

function hasExpectedFileSignature(file: Express.Multer.File) {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/gif') return bytes.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/) !== null;
  if (file.mimetype === 'image/webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (file.mimetype === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  if (file.mimetype === 'audio/wav') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WAVE';
  if (['audio/m4a', 'audio/x-m4a', 'video/mp4'].includes(file.mimetype)) return bytes.subarray(4, 8).toString('ascii') === 'ftyp';
  if (file.mimetype === 'video/webm') return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (file.mimetype === 'audio/ogg') return bytes.subarray(0, 4).toString('ascii') === 'OggS';
  if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
    return bytes.subarray(0, 3).toString('ascii') === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  }
  if (file.mimetype === 'audio/aac') return bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
  return false;
}
