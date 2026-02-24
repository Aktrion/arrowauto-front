import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons';
import { VehicleService } from '../vehicles/services/vehicle.service';

@Component({
  selector: 'app-inspection-list',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DatePipe],
  templateUrl: './inspection-list.component.html',
  styleUrl: './inspection-list.component.css',
})
export class InspectionListComponent {
  icons = ICONS;
  private readonly vehicleService = inject(VehicleService);
  private readonly router = inject(Router);

  vehicles = this.vehicleService.vehicles;
  isTableView = signal(true);
  currentPage = signal(1);
  readonly pageSize = 10;

  searchQuery = signal('');
  statusFilter = signal<'all' | 'inspection' | 'in_progress'>('all');

  filteredVehicles = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return this.vehicles().filter((vehicle) => {
      if (!['inspection', 'in_progress'].includes(vehicle.status)) {
        return false;
      }

      if (status !== 'all' && vehicle.status !== status) {
        return false;
      }

      if (!query) return true;

      const plate = vehicle.vehicle?.licensePlate?.toLowerCase() || '';
      const make = vehicle.vehicle?.make?.toLowerCase() || '';
      const model = vehicle.vehicle?.model?.toLowerCase() || '';
      const job = vehicle.vehicle?.jobNumber?.toLowerCase() || '';

      return (
        plate.includes(query) ||
        make.includes(query) ||
        model.includes(query) ||
        job.includes(query)
      );
    });
  });

  paginatedVehicles = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredVehicles().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredVehicles().length / this.pageSize)),
  );

  statusCounts = computed(() => {
    const items = this.vehicles().filter((vehicle) =>
      ['inspection', 'in_progress'].includes(vehicle.status),
    );
    return {
      all: items.length,
      inspection: items.filter((item) => item.status === 'inspection').length,
      in_progress: items.filter((item) => item.status === 'in_progress').length,
    };
  });

  setStatusFilter(status: 'all' | 'inspection' | 'in_progress'): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  toggleView(isTable: boolean): void {
    this.isTableView.set(isTable);
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages()) return;
    this.currentPage.update((p) => p + 1);
  }

  prevPage(): void {
    if (this.currentPage() <= 1) return;
    this.currentPage.update((p) => p - 1);
  }

  openInspection(instanceId?: string): void {
    if (!instanceId) return;
    this.router.navigate(['/inspection', instanceId]);
  }

  // Service Helpers
  formatStatus = (s: string) => this.vehicleService.formatStatus(s);
  getStatusBadgeClass = (s: string) => this.vehicleService.getStatusBadgeClass(s);
}
