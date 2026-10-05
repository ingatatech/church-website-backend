import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../../../helpers/message/api.response';
import { CreateSubmissionDto } from './submission.dto';
import { SubmissionsService } from './submissions.service';
@ApiTags('Visitor engagement')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}
  @Post() @ApiOperation({ summary: 'Submit a contact message, prayer request, or visitor inquiry', description: 'Submission is stored for follow-up. Treat prayer requests as sensitive personal information.' }) @ApiCreatedResponse({ type: ApiResponseDto })
  async create(@Body() dto: CreateSubmissionDto) { return ApiResponseDto.created('Your message has been received. Thank you for contacting us.', await this.service.create(dto)); }
}
