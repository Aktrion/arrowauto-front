import { MongoEntity } from '@shared/models/mongo-entity.model';
import { User } from '@shared/models/user.model';

/** Catalogo maestro de operaciones (tipos de trabajo) - API /operations */
export interface OperationMaster extends MongoEntity {
  id: string;
  shortName: string;
  description?: string;
  defaultDuration: number;
  defaultRatePerHour: number;
}

export type OperationCategory =
  | 'inspection'
  | 'cleaning'
  | 'repair'
  | 'maintenance'
  | 'other';

export interface Operation {
  id: string;
  code: string;
  name: string;
  description?: string;
  estimatedDuration: number;
  defaultPrice: number;
  category: OperationCategory;
}

export type OperationStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'cancelled';

export interface VehicleOperation {
  id: string;
  vehicleId: string;
  vehicleInstanceId?: string;
  operationId: string;
  operation?: Operation;
  assignedUserId?: string;
  assignedUser?: User;
  scheduledDate?: Date;
  scheduledTime?: string;
  status: OperationStatus;
  actualDuration?: number;
  actualPrice?: number;
  hourlyRate?: number;
  notes?: string;
  completedAt?: Date;
}
