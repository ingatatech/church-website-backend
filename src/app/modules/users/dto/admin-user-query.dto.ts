import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole, UserStatus } from '../../../../utils/enums';

export class AdminUserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  role?: UserRole | 'all';

  @IsOptional()
  status?: UserStatus | 'all';
}
