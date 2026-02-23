import { Client } from '../../clients/models/client.model';
import { BackendInspectionValue } from '../../inspection/services/inspection.service';

export type VehicleStatus =
  | 'pending'
  | 'in_progress'
  | 'inspection'
  | 'awaiting_approval'
  | 'approved'
  | 'completed'
  | 'invoiced';

export interface Vehicle {
  _id?: string;
  licensePlate: string;
  make: string;
  model: string;
  description?: string;
  year?: number;
  colour: string;
  vin?: string;
  mileage?: number;
  registrationDate?: string;
  engine?: string;
  next_entry?: string;
  // clientId?: string;
  // client?: Client;
  jobNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VehicleInstance {
  _id?: string;
  code?: string; // autogen, unique
  vehicleId?: string;
  vehicle?: Vehicle;
  statusId?: string;
  customerId?: string;
  inspectionTemplateId?: string;
  status: VehicleStatus;
  checkInDate?: Date;
  inspectionDate?: Date;
  partsEstimatedDate?: Date;
  labourEstimatedDate?: Date;
  taskAuthDate?: Date;
  checkOutDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  inspectionValues?: BackendInspectionValue[];
  inspectionValueIds?: string[];
  // repairs: Repair[];
  // operations: Operation[];
  // customerCommunications: CustomerCommunication[];
  // movements: Movement[];

  odometer?: number;
  distanceUnit: 'miles' | 'km';
}

// Legacy alias during migration
export type Product = VehicleInstance;

export type VehicleInstanceActivityEventType =
  | 'product_created'
  | 'status_changed'
  | 'services_updated'
  | 'operations_updated'
  | 'movements_updated';

export interface VehicleInstanceActivityEvent {
  type: VehicleInstanceActivityEventType;
  occurredAt: Date;
  actorName?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// Legacy alias during migration
export type ProductActivityEvent = VehicleInstanceActivityEvent;

export interface BackendSearchResponse<T> {
  data: T[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

export interface BackendStatusStep {
  _id?: string;
  id?: string;
  name?: string;
  order?: number;
}

export interface BackendProductActivityEvent {
  type?: string;
  occurredAt?: string;
  actorName?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface BackendProductActivityResponse {
  vehicleInstanceId?: string;
  // Legacy compatibility field
  productId?: string;
  total?: number;
  data?: BackendProductActivityEvent[];
}
