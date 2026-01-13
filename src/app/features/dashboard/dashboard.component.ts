import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { UserService } from '../../core/services/user.service';
import { ClientService } from '../clients/services/client.service';
import { DashboardService } from './services/dashboard.service';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, LucideAngularModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  icons = ICONS;
  private vehicleService = inject(VehicleService);
  private userService = inject(UserService);
  private clientService = inject(ClientService);
  private dashboardService = inject(DashboardService);

  vehicles = this.vehicleService.vehicles;
  operators = this.userService.operatorsByRole;
  stats = this.dashboardService.dashboardStats;

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    const client = this.clientService.getClientById(clientId);
    return client?.name ?? 'Unknown';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      in_progress: 'status-in-progress',
      inspection: 'status-inspection',
      awaiting_approval: 'status-awaiting',
      approved: 'status-completed',
      completed: 'status-completed',
      invoiced: 'status-completed',
    };
    return classes[status] || 'status-pending';
  }

  getProgress(status: string): number {
    const progress: Record<string, number> = {
      pending: 1,
      inspection: 2,
      awaiting_approval: 2,
      in_progress: 3,
      approved: 3,
      completed: 4,
      invoiced: 4,
    };
    return progress[status] || 0;
  }
}
