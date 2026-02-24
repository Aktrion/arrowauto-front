import { User } from '@shared/models/user.model';
import { Vehicle } from '@features/vehicles/models/vehicle.model';
import { MongoEntity } from '@shared/models/mongo-entity.model';

export interface InspectionPointEntity {
  _id?: string;
  id?: string;
  name: string;
  inspectionBlockId?: string;
  scriptedComments?: string[];
  tyrePosition?: string;
  type?: 'standard' | 'tyre';
}

export interface InspectionBlockEntity {
  _id?: string;
  id?: string;
  name: string;
  order?: number;
}

export interface InspectionValue extends MongoEntity {
  id?: string;
  vehicleInstanceId?: string;
  productId?: string;
  inspectionPointId?: string;
  inspectionPoint?: { _id?: string; id?: string };
  type: 'standard' | 'tyre';
  value?: 'red' | 'yellow' | 'ok';
  comments?: string[];
  mediaUrls?: string[];
  innerDepth?: number;
  midDepth?: number;
  outerDepth?: number;
}

export interface InspectionTemplatePoint {
  _id?: string;
  id?: string;
  name: string;
  type?: 'standard' | 'tyre';
  scriptedComments?: string[];
  tyrePosition?: string;
}

export interface InspectionTemplateBlock {
  _id?: string;
  id?: string;
  name: string;
  order?: number;
  points?: InspectionTemplatePoint[];
}

export interface InspectionTemplateStructure {
  _id?: string;
  id?: string;
  name: string;
  blocks: InspectionTemplateBlock[];
}

export interface InspectionPoint {
  id: string;
  code?: string;
  category: string;
  name: string;
  type?: 'standard' | 'tyre';
  description?: string;
  predefinedComments: string[];
}

export type InspectionPointStatus = 'ok' | 'warning' | 'defect' | 'not_inspected';

export interface TyreMeasurement {
  inner: number;
  middle: number;
  outer: number;
}

export type TyreCondition = 'good' | 'acceptable' | 'attention' | 'unknown';

export interface InspectionResult {
  id: string;
  vehicleId: string;
  pointId: string;
  point?: InspectionPoint;
  status: InspectionPointStatus;
  severity?: 'minor' | 'major';
  comment?: string;
  photos: string[];
  partsCost?: number;
  laborCost?: number;
  laborHours?: number;
  hourlyRate?: number;
  requiresParts: boolean;
  customerApproved?: boolean;
  tyreMeasurements?: TyreMeasurement;
  tyreCondition?: TyreCondition;
}

export interface Inspection {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  inspectorId: string;
  inspector?: User;
  results: InspectionResult[];
  status: 'in_progress' | 'completed' | 'sent_to_customer' | 'customer_approved';
  totalPartsCost: number;
  totalLaborCost: number;
  totalCost: number;
  createdAt: Date;
  completedAt?: Date;
  customerApprovedAt?: Date;
}
