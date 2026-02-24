import { CountryEnum } from '@shared/enums/country.enum';
import { Role } from '@shared/models/role.model';
import { MongoEntity } from '@shared/models/mongo-entity.model';

export interface BackendUser extends MongoEntity {
  id?: string;
  name: string;
  userName?: string;
  language?: string;
  country?: string;
  imageUrl?: string;
  avatar?: string;
  isActive?: boolean;
  enabled?: boolean;
  emails?: string[];
  role?: { _id?: string; id?: string; name: string };
  roleId?: string;
}

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
