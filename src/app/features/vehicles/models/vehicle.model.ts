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
  id?: string;
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
  id?: string;
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
  // inspectionValues: InspectionValue[];
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
