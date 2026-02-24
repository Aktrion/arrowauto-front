import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { DashboardData, DashboardStats } from '@features/dashboard/models/dashboard.model';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { UserService } from '@core/services/user.service';
import { Product } from '@features/vehicles/models/vehicle.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private instanceApi = inject(VehicleInstancesApiService);
  private userService = inject(UserService);

  fetchDashboard(): Observable<DashboardData> {
    return forkJoin({
      vehiclesRes: this.instanceApi.findByPagination({
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      users: this.userService.fetchUsers(),
    }).pipe(
      map(({ vehiclesRes, users }) => {
        const vehicles = vehiclesRes.data ?? [];
        const stats = this.computeStats(vehicles, users);
        return { stats, vehicles };
      }),
    );
  }

  private computeStats(vehicles: Product[], users: { id?: string; role?: { name?: string } }[]): DashboardStats {
    const today = new Date().toDateString();
    return {
      activeVehicles: vehicles.filter((v) => v.status !== 'completed' && v.status !== 'invoiced').length,
      pendingInspections: vehicles.filter((v) => v.status === 'inspection').length,
      awaitingApproval: vehicles.filter((v) => v.status === 'awaiting_approval').length,
      completedToday: vehicles.filter(
        (v) =>
          v.status === 'completed' &&
            (v.updatedAt instanceof Date
            ? v.updatedAt.toDateString()
            : new Date((v.updatedAt as string | undefined) ?? 0).toDateString()) === today,
      ).length,
      totalRevenue: 0,
      operatorsAvailable: users.filter((u) => u.role?.name?.toLowerCase() === 'operator').length,
    };
  }
}
