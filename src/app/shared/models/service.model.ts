import { User } from './user.model';

export type OperationCategory = 'inspection' | 'cleaning' | 'repair' | 'maintenance' | 'other';

export interface Operation {
  id: string;
  code: string;
  name: string;
  description?: string;
  estimatedDuration: number; // in minutes
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
