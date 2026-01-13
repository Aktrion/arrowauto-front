import { Client } from '../../clients/models/client.model';

export type VehicleStatus =
  | 'pending'
  | 'in_progress'
  | 'inspection'
  | 'awaiting_approval'
  | 'approved'
  | 'completed'
  | 'invoiced';

export interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vin?: string;
  mileage?: number;
  clientId?: string;
  client?: Client;
  jobNumber?: string;
  status: VehicleStatus;
  createdAt: Date;
  updatedAt: Date;
}
