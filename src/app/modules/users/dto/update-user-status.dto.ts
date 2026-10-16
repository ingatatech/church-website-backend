import { IsEnum } from 'class-validator';
import { UserStatus } from '../../../../utils/enums';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus, {
    message: 'Status must be "active", "pending", or "disabled"',
  })
  status: UserStatus;
}
