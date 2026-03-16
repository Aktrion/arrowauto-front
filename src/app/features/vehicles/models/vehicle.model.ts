import { Customer } from '@features/clients/models/client.model';
import { InspectionValue } from '@features/inspection/models/inspection.model';
import { InspectionTemplate } from '@features/settings/inspection-templates/models/inspection-template.model';
import { MongoEntity } from '@shared/models/mongo-entity.model';

export type VehicleStatus =
  | 'checked_in'
  | 'pending_inspection'
  | 'pending_estimation'
  | 'pending_approval'
  | 'pending_operations'
  | 'ready_for_pickup'
  | 'checked_out';

export interface Vehicle extends MongoEntity {
  licensePlate: string;
  make: string;
  model: string;
  /** Alias used by some API responses */
  vehicleModel?: string;
  description?: string;
  year?: number;
  colour: string;
  vin?: string;
  registrationDate?: string;
  engine?: string;
  nextEntryDate?: Date | string;
  vehicleInstances?: VehicleInstance[];
}

/** API response when customer/inspectionTemplate refs are populated */
export interface VehicleInstanceApiResponse extends Omit<VehicleInstance, 'status'> {
  customer?: Customer;
  inspectionTemplate?: InspectionTemplate;
  /** Status may come as object with name in legacy API */
  status?: VehicleStatus | { name?: string };
}

export interface VehicleInstance extends MongoEntity {
  code?: string;
  vehicleId?: string;
  vehicle?: Vehicle;
  customerId?: string;
  inspectionTemplateId?: string;
  status: VehicleStatus;
  inspectionValues?: InspectionValue[];
  inspectionValueIds?: string[];
  mileage?: number;
  distanceUnit: 'miles' | 'km';
  movements?: string[];
}

export type VehicleInstanceActivityEventType =
  | 'vehicle_instance_created'
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

export interface VehicleInstanceActivityEventPayload {
  type?: string;
  occurredAt?: string;
  actorName?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface VehicleInstanceActivityResponse {
  vehicleInstanceId?: string;
  total?: number;
  data?: VehicleInstanceActivityEventPayload[];
}
