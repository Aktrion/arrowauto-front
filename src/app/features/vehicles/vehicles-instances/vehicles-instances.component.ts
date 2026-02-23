import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '../../../shared/icons';
import { VehicleService } from '../services/vehicle.service';
import { ClientService } from '../../clients/services/client.service';
import { Product } from '../models/vehicle.model';

@Component({
  selector: 'app-vehicles-instances',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, LucideAngularModule, TranslateModule],
  templateUrl: './vehicles-instances.component.html',
})
export class VehiclesInstancesComponent {
  icons = ICONS;
  private vehicleService = inject(VehicleService);
  private clientService = inject(ClientService);
  private router = inject(Router);

  vehicles = this.vehicleService.vehicles;
  clients = this.clientService.clients;
  filteredVehicles = signal<Product[]>([]);
  isTableView = signal(true);
  currentPage = signal(1);
  readonly pageSize = 10;

  searchQuery = '';
  searchField: 'all' | 'plate' | 'make' | 'model' | 'client' | 'job' = 'all';
  statusFilter = '';

  paginatedVehicles = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredVehicles().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredVehicles().length / this.pageSize)),
  );

  constructor() {
    effect(() => {
      this.filteredVehicles.set(this.vehicles());
      if (this.searchQuery || this.statusFilter) {
        this.filterVehicles();
      }
    });
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
      filtered = filtered.filter((v) => {
        const plate = v.vehicle?.licensePlate?.toLowerCase() || '';
        const make = v.vehicle?.make?.toLowerCase() || '';
        const model = v.vehicle?.model?.toLowerCase() || '';
        const job = v.vehicle?.jobNumber?.toLowerCase() || '';
        const client = this.getClientName(v.customerId).toLowerCase();

        if (this.searchField === 'plate') return plate.includes(query);
        if (this.searchField === 'make') return make.includes(query);
        if (this.searchField === 'model') return model.includes(query);
        if (this.searchField === 'job') return job.includes(query);
        if (this.searchField === 'client') return client.includes(query);

        return (
          plate.includes(query) ||
          make.includes(query) ||
          model.includes(query) ||
          job.includes(query) ||
          client.includes(query)
        );
      });
    }

    if (this.statusFilter) {
      filtered = filtered.filter((v) => v.status === this.statusFilter);
    }

    this.filteredVehicles.set(filtered);
    this.currentPage.set(1);
  }

  setSearchField(field: 'all' | 'plate' | 'make' | 'model' | 'client' | 'job') {
    this.searchField = field;
    this.filterVehicles();
  }

  nextPage() {
    if (this.currentPage() >= this.totalPages()) return;
    this.currentPage.update((p) => p + 1);
  }

  prevPage() {
    if (this.currentPage() <= 1) return;
    this.currentPage.update((p) => p - 1);
  }

  openNewVehicleModal(): void {
    this.router.navigate(['/vehicles/new']);
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
