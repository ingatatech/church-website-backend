import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { AuditService } from './audit.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}
  @Get()
  @ApiOperation({
    summary: 'List recent administrative and inquiry audit events',
  })
  @ApiOkResponse()
  list(@Query() query: ListAuditLogsDto) {
    return this.service.list(query.page, query.limit);
  }
}
