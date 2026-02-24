import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';
import { UserService } from '@core/services/user.service';
import { Client } from '@features/clients/models/client.model';
import { ClientService } from '@features/clients/services/client.service';
import { DashboardService } from '@features/dashboard/services/dashboard.service';
import { ICONS } from '@shared/icons';

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
export class DashboardComponent implements OnInit {
  icons = ICONS;
  private userService = inject(UserService);
  private clientService = inject(ClientService);
  private dashboardService = inject(DashboardService);
  private router = inject(Router);

  private vehiclesSignal = signal<any[]>([]);
  private statsSignal = signal<any>({
    activeVehicles: 0,
    pendingInspections: 0,
    awaitingApproval: 0,
    completedToday: 0,
    totalRevenue: 0,
    operatorsAvailable: 0,
  });

  ngOnInit(): void {
    this.dashboardService.fetchDashboard().subscribe((data) => {
      this.vehiclesSignal.set(data.vehicles);
      this.statsSignal.set(data.stats);
    });
    this.clientService.fetchClients().subscribe((c) => this.clients.set(c));
    this.userService.fetchUsers().subscribe((u) => this.users.set(u));
  }

  searchQuery = '';
  searchField = 'plate';
  isSearching = false;

  readonly vehicles = this.vehiclesSignal.asReadonly();
  users = signal<any[]>([]);
  operators = computed(() => this.userService.getOperators(this.users()));
  readonly stats = this.statsSignal.asReadonly();

  private clients = signal<Client[]>([]);

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    return this.clientService.getClientById(this.clients(), clientId)?.name ?? 'Unknown';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatStatus = (s: string) => VehicleStatusUtils.formatStatus(s);
  getStatusBadgeClass = (s: string) => VehicleStatusUtils.getStatusBadgeClass(s);
  getProgress = (s: string) => VehicleStatusUtils.getProgressStep(s);

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
