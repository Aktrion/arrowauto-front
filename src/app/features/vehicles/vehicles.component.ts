import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '../../shared/icons';
import { VehicleService } from './services/vehicle.service';
import { ClientService } from '../clients/services/client.service';
import { OperationService } from '../../shared/services/operation.service';
import { Product, Vehicle } from '../../core/models';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, LucideAngularModule, TranslateModule],
  templateUrl: './vehicles.component.html',
})
export class VehiclesComponent {
  icons = ICONS;
  private vehicleService = inject(VehicleService);
  private clientService = inject(ClientService);
  private router = inject(Router);

  vehicles = this.vehicleService.vehicles;
  clients = this.clientService.clients;
  filteredVehicles = signal<Product[]>([]);
  isTableView = signal(true);

  searchQuery = '';
  statusFilter = '';

  constructor() {
    this.filteredVehicles.set(this.vehicles());
  }

  toggleView(isTable: boolean): void {
    this.isTableView.set(isTable);
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.filterVehicles();
  }

  filterVehicles(): void {
    let filtered = this.vehicles();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.vehicle?.licensePlate?.toLowerCase().includes(query) ||
          v.vehicle?.make?.toLowerCase().includes(query) ||
          v.vehicle?.model?.toLowerCase().includes(query) ||
          v.vehicle?.jobNumber?.toLowerCase().includes(query),
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter((v) => v.status === this.statusFilter);
    }

    this.filteredVehicles.set(filtered);
  }

  openNewVehicleModal(): void {
    this.router.navigate(['/vehicles/new']);
  }

  openVehicleDetail(vehicle: Product): void {
    this.router.navigate(['/vehicles', vehicle.id]);
  }

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    const client = this.clientService.getClientById(clientId);
    return client?.name ?? 'Unknown';
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

  getProgressPercent(status: string): number {
    return this.getProgress(status) * 25;
  }
}
