import { PermissionsEnum } from '../enums/permission.enum';
import { RoleEnum } from '../enums/role.enum';

export interface Role {
  name: string;
  permissions?: PermissionsEnum[];
  hierarchy?: RoleEnum;
}
