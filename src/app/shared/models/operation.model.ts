import { MongoEntity } from '@shared/models/mongo-entity.model';

/** Catalogo maestro de operaciones (tipos de trabajo) - API /operations */
export interface OperationMaster extends MongoEntity {
  id: string;
  shortName: string;
  description?: string;
  defaultDuration: number;
  defaultRatePerHour: number;
}

export interface StatusStep {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  order?: number;
}

export interface ProductReference {
  _id?: string;
  id?: string;
  vehicleId?: string;
  services?: string[];
  operations?: string[];
  statusId?: string;
}
