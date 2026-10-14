import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { FaqService } from './faq.service';
import {
  CreateFaqDto,
  FaqStatusDto,
  ReorderFaqsDto,
  UpdateFaqDto,
} from './faq.dto';

@ApiTags('Admin FAQs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/faqs')
export class AdminFaqsController {
  constructor(private readonly faqs: FaqService) {}
  @Get() list(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.faqs.list({ category, status, search }, true);
  }
  @Post() create(@Body() input: CreateFaqDto) {
    return this.faqs.create(input);
  }
  @Patch('reorder') reorder(@Body() input: ReorderFaqsDto) {
    return this.faqs.reorder(input.ids);
  }
  @Patch(':id/status') setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: FaqStatusDto,
  ) {
    return this.faqs.setStatus(id, input.status);
  }
  @Patch(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateFaqDto,
  ) {
    return this.faqs.update(id, input);
  }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.faqs.remove(id);
  }
}
