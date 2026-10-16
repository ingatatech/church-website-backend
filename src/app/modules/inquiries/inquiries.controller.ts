import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import {
  CreateInquiryDto,
  UpdateInquiryStatusDto,
  ReplyInquiryDto,
} from './dto/create-inquiry.dto';
import { InquiriesService } from './inquiries.service';
@ApiTags('Inquiries')
@Controller('inquiries')
@Throttle({ default: { limit: 8, ttl: 60000 } })
export class InquiriesController {
  constructor(private readonly service: InquiriesService) {}
  @Post('contact')
  @ApiOperation({ summary: 'Submit a general contact message' })
  @ApiCreatedResponse()
  contact(@Body() dto: CreateInquiryDto) {
    return this.service.contact(dto);
  }
  @Post('visitor')
  @ApiOperation({ summary: 'Submit a first-time visitor inquiry' })
  @ApiCreatedResponse()
  visitor(@Body() dto: CreateInquiryDto) {
    return this.service.visitor(dto);
  }
  @Post('prayer')
  @ApiOperation({ summary: 'Submit a private prayer request' })
  @ApiCreatedResponse()
  prayer(@Body() dto: CreateInquiryDto) {
    return this.service.prayer(dto);
  }
  @Get(':type')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List inquiries of one type (administrator)' })
  @ApiOkResponse()
  list(@Param('type') type: string) {
    return this.service.list(type);
  }
  @Patch(':type/:id/status')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an inquiry status (administrator)' })
  @ApiOkResponse()
  updateStatus(
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    return this.service.updateStatus(type, id, dto);
  }
  @Patch(':type/:id/reply')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save an admin reply for an inquiry (administrator)' })
  @ApiOkResponse()
  reply(
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyInquiryDto,
  ) {
    return this.service.reply(type, id, dto);
  }
}
