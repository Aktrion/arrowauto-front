import { User } from '../../../shared/models/user.model';
import { Vehicle } from '../../vehicles/models/vehicle.model';

export interface InspectionPoint {
  id: string;
  code?: string;
  category: string;
  name: string;
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
