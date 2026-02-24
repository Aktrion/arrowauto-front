import { MongoEntity } from '@shared/models/mongo-entity.model';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  type: 'individual' | 'company';
}

export interface Customer extends MongoEntity {
  id?: string;
  title?: string;
  firstName: string;
  lastName: string;
  mobilePhoneNumber?: string;
  emails?: string[];
}

export interface CreateCustomerDto {
  title?: string;
  firstName: string;
  lastName: string;
  mobilePhoneNumber?: string;
  emails?: string[];
}

export type UpdateCustomerDto = Partial<CreateCustomerDto>;
