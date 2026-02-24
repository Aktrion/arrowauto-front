import { CountryEnum } from '@shared/enums/country.enum';
import { Role } from '@shared/models/role.model';
import { MongoEntity } from '@shared/models/mongo-entity.model';

export type UserRole = 'admin' | 'operator' | 'supervisor';

export interface User extends MongoEntity {
  id?: string;
  name: string;
  imageUrl?: string;
  avatar?: string;
  userName?: string;
  emails?: string[];
  password?: string;
  language?: string;
  lastLogin?: string;
  timeZone?: string;
  enabled?: boolean;
  isActive?: boolean;
  godMode?: boolean;
  roleId?: string;
  siteIds?: string[];
  customerIds?: string[];
  jobGroupIds?: string[];
  createdBy?: User;
  // customers?: Customer[];
  country?: CountryEnum;
  // sites?: Site[];
  role?: Role | { _id?: string; id?: string; name: string };
}
