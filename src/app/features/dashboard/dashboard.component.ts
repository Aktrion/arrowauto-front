import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { UserService } from '../../core/services/user.service';
import { ClientService } from '../clients/services/client.service';
import { DashboardService } from './services/dashboard.service';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DecimalPipe,
    LucideAngularModule,
    TranslateModule,
    FormsModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  icons = ICONS;
  private vehicleService = inject(VehicleService);
  private userService = inject(UserService);
  private clientService = inject(ClientService);
  private dashboardService = inject(DashboardService);
  private router = inject(Router);

  searchQuery = '';
  searchField = 'plate';
  isSearching = false;

  vehicles = this.vehicleService.vehicles;
  operators = this.userService.operatorsByRole;
  stats = this.dashboardService.dashboardStats;

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    return this.clientService.getClientById(clientId)?.name ?? 'Unknown';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Service Helpers
  formatStatus = (s: string) => this.vehicleService.formatStatus(s);
  getStatusBadgeClass = (s: string) => this.vehicleService.getStatusBadgeClass(s);
  getProgress = (s: string) => this.vehicleService.getProgressStep(s);

  quickSearch(): void {
    if (!this.searchQuery.trim()) return;
    this.isSearching = true;

    // Simulate search delay for UX
    setTimeout(() => {
      this.isSearching = false;
      const lowerQuery = this.searchQuery.trim().toLowerCase();

      const found = this.vehicles().find((v) => {
        if (this.searchField === 'plate') {
          return (
            v.vehicle?.licensePlate?.toLowerCase().includes(lowerQuery) ||
            v.vehicle?.vin?.toLowerCase().includes(lowerQuery)
          );
        } else {
          return v.vehicle?.jobNumber?.toLowerCase().includes(lowerQuery);
        }
      });

      if (found) {
        this.router.navigate(['/vehicles-instances', found._id]);
      } else {
        // Just navigate to the list with query params
        this.router.navigate(['/vehicles-instances'], { queryParams: { q: lowerQuery } });
      }
    }, 400);
  }
}
