export enum RoleEnum {
  OWNER = 'OWNER',
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  INSPECTOR = 'INSPECTOR',
  CUSTOMER = 'CUSTOMER',
}

export const RoleHierarchy: RoleEnum[] = [
  RoleEnum.OWNER,
  RoleEnum.SUPERADMIN,
  RoleEnum.ADMIN,
  RoleEnum.SUPERVISOR,
  RoleEnum.INSPECTOR,
  RoleEnum.CUSTOMER,
];
