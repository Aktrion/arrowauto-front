import { Client } from '@features/clients/models/client.model';
import { InspectionValue } from '@features/inspection/models/inspection.model';
import { MongoEntity } from '@shared/models/mongo-entity.model';

export type VehicleStatus =
  | 'pending'
  | 'in_progress'
  | 'inspection'
  | 'awaiting_approval'
  | 'approved'
  | 'completed'
  | 'invoiced';

export interface Vehicle extends MongoEntity {
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
  nextEntryDate?: string;
  // clientId?: string;
  // client?: Client;
}

export interface VehicleInstance extends MongoEntity {
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
  inspectionValues?: InspectionValue[];
  inspectionValueIds?: string[];
  // operations: Operation[];
  // customerCommunications: CustomerCommunication[];
  // movements: Movement[];

  odometer?: number;
  distanceUnit: 'miles' | 'km';
  services?: string[];
  operations?: string[];
  movements?: string[];
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

// SearchRequestResponse unified into core type
// StatusStep moved to shared/models/operation.model.ts

export interface VehicleInstanceActivityEventPayload {
  type?: string;
  occurredAt?: string;
  actorName?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface VehicleInstanceActivityResponse {
  vehicleInstanceId?: string;
  // Legacy compatibility field
  productId?: string;
  total?: number;
  data?: VehicleInstanceActivityEventPayload[];
}
