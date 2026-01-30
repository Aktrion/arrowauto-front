import { CountryEnum } from '../enums/country.enum';
import { Role } from './role.model';

export type UserRole = 'admin' | 'operator' | 'supervisor';

export interface User {
  id?: string;
  name: string;
  imageUrl?: string;
  userName?: string;
  emails?: string[];
  password?: string;
  language?: string;
  lastLogin?: string;
  timeZone?: string;
  enabled?: boolean;
  godMode?: boolean;
  roleId?: string;
  siteIds?: string[];
  customerIds?: string[];
  jobGroupIds?: string[];
  createdBy?: User;
  // customers?: Customer[];
  country?: CountryEnum;
  // sites?: Site[];
  role?: Role;
}
