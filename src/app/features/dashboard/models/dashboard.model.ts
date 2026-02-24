import { Product } from '@features/vehicles/models/vehicle.model';

export interface DashboardStats {
  activeVehicles: number;
  pendingInspections: number;
  awaitingApproval: number;
  completedToday: number;
  totalRevenue: number;
  operatorsAvailable: number;
}

export interface DashboardData {
  stats: DashboardStats;
  vehicles: Product[];
}
