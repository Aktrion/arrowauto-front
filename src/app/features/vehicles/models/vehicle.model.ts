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
  registrationDate: string;
  engine?: string;
  next_entry?: string;
  clientId?: string;
  client?: Client;
  jobNumber?: string;
  status: VehicleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  code: string; // autogen, unique
  vehicleId: string;
  statusId: string;
  customerId: string;
  inspectionTemplateId: string;

  checkInDate?: Date;
  inspectionDate?: Date;
  partsEstimatedDate?: Date;
  labourEstimatedDate?: Date;
  taskAuthDate?: Date;
  checkOutDate?: Date;

  // inspectionValues: InspectionValue[];
  // repairs: Repair[];
  // operations: Operation[];
  // customerCommunications: CustomerCommunication[];
  // movements: Movement[];

  odometer?: number;
  distanceUnit: 'miles' | 'km';
}
