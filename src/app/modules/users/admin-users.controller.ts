import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('Admin users management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listUsers(@Query() query: AdminUserQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() currentUser: { id: string },
  ) {
    return this.usersService.updateRole(id, dto.role, currentUser.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() currentUser: { id: string },
  ) {
    return this.usersService.updateStatus(id, dto.status, currentUser.id);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string },
  ) {
    return this.usersService.deleteUser(id, currentUser.id);
  }
}
