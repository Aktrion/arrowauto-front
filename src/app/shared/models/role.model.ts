import { PermissionsEnum } from '@shared/enums/permission.enum';
import { RoleEnum } from '@shared/enums/role.enum';

export interface Role {
  name: string;
  permissions?: PermissionsEnum[];
  hierarchy?: RoleEnum;
}
