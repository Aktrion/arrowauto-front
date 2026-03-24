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
  inspectionValueId?: string;
  operation?: Operation;
  assignedUserId?: string;
  assignedUser?: User;
  scheduledDate?: Date;
  scheduledTime?: string;
  status: OperationStatus;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: Date;
  /** Hours allowed for this labour line */
  timeAllowed?: number;
  /** Rate per hour in £ */
  ratePerHour?: number;
  /** VAT percentage (e.g. 20) */
  vat?: number;
  labourCode?: string;
  labourDescription?: string;
  actualDuration?: number;
  actualPrice?: number;
  notes?: string;
  completedAt?: Date;
}
