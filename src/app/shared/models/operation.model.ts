import { MongoEntity } from '@shared/models/mongo-entity.model';

/** Catálogo maestro de operaciones (tipos de trabajo) - API /operations */
export interface OperationMaster {
  id: string;
  shortName: string;
  description?: string;
  defaultDuration: number;
  defaultRatePerHour: number;
}

export interface BackendOperation extends MongoEntity {
  id?: string;
  shortName: string;
  description?: string;
  defaultDuration: number;
  defaultRatePerHour: number;
}

export interface BackendStatusStep {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  order?: number;
}

export interface BackendProduct {
  _id?: string;
  id?: string;
  vehicleId?: string;
  services?: string[];
  operations?: string[];
  statusId?: string;
}
