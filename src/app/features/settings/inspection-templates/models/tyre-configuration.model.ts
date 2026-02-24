import { MongoEntity } from '@shared/models/mongo-entity.model';

export interface TyreConfiguration extends MongoEntity {
  code: string;
  amberUpLimit: number;
  redUpLimit: number;
  chooseType?: string;
  winterAmberUpLimit?: number;
  winterRedUpLimit?: number;
}

export interface CreateTyreConfigurationDto {
  code: string;
  amberUpLimit: number;
  redUpLimit: number;
  chooseType?: string;
  winterAmberUpLimit?: number;
  winterRedUpLimit?: number;
}

export interface UpdateTyreConfigurationDto {
  code?: string;
  amberUpLimit?: number;
  redUpLimit?: number;
  chooseType?: string;
  winterAmberUpLimit?: number;
  winterRedUpLimit?: number;
}
