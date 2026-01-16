import { Injectable, computed, inject } from '@angular/core';
import { DashboardStats } from '../models/dashboard.model';
import { VehicleService } from '../../vehicles/services/vehicle.service';
import { UserService } from '../../../core/services/user.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private vehicleService = inject(VehicleService);
  private userService = inject(UserService);

  readonly dashboardStats = computed<DashboardStats>(() => {
    const vehicles = this.vehicleService.vehicles();
    const today = new Date().toDateString();

    return {
      activeVehicles: vehicles.filter((v) => v.status !== 'completed' && v.status !== 'invoiced')
        .length,
      pendingInspections: vehicles.filter((v) => v.status === 'inspection').length,
      awaitingApproval: vehicles.filter((v) => v.status === 'awaiting_approval').length,
      completedToday: vehicles.filter(
        (v) => v.status === 'completed' && v.updatedAt?.toDateString() === today
      ).length,
      totalRevenue: 45780.5, // Mock static value from original service
      operatorsAvailable: this.userService.users().filter((u) => u.role === 'operator').length,
    };
  });
}
