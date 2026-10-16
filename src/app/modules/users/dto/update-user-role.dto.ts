import { IsEnum } from 'class-validator';
import { UserRole } from '../../../../utils/enums';

export class UpdateUserRoleDto {
  @IsEnum(UserRole, {
    message: 'Role must be either "admin" or "member"',
  })
  role: UserRole;
}
