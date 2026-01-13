import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons';
import { VehicleService } from './services/vehicle.service';
import { ClientService } from '../clients/services/client.service';
import { OperationService } from '../../shared/services/operation.service';
import { Vehicle } from '../../core/models';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, LucideAngularModule],
  templateUrl: './vehicles.component.html',
})
export class VehiclesComponent {
  icons = ICONS;
  private vehicleService = inject(VehicleService);
  private clientService = inject(ClientService);
  private operationService = inject(OperationService);

  vehicles = this.vehicleService.vehicles;
  clients = this.clientService.clients;
  filteredVehicles = signal<Vehicle[]>([]);
  selectedVehicle = signal<Vehicle | null>(null);
  hpiResult = signal(false);

  searchQuery = '';
  statusFilter = '';

  newVehicle = {
    plate: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    mileage: undefined as number | undefined,
    vin: '',
    clientId: '',
  };

  constructor() {
    this.filteredVehicles.set(this.vehicles());
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
          v.plate.toLowerCase().includes(query) ||
          v.make.toLowerCase().includes(query) ||
          v.model.toLowerCase().includes(query) ||
          v.jobNumber?.toLowerCase().includes(query)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter((v) => v.status === this.statusFilter);
    }

    this.filteredVehicles.set(filtered);
  }

  openNewVehicleModal(): void {
    this.resetNewVehicle();
    (document.getElementById('new_vehicle_modal') as HTMLDialogElement)?.showModal();
  }

  openVehicleDetail(vehicle: Vehicle): void {
    this.selectedVehicle.set(vehicle);
    (document.getElementById('vehicle_detail_modal') as HTMLDialogElement)?.showModal();
  }

  performHPICheck(): void {
    if (!this.newVehicle.plate) return;

    setTimeout(() => {
      this.newVehicle.make = 'BMW';
      this.newVehicle.model = '320d';
      this.newVehicle.year = 2022;
      this.newVehicle.color = 'Black';
      this.newVehicle.vin = 'WBAXXXXXXXXX12345';
      this.hpiResult.set(true);
    }, 500);
  }

  createVehicle(): void {
    if (!this.newVehicle.plate || !this.newVehicle.make || !this.newVehicle.model) return;

    this.vehicleService.addVehicle({
      plate: this.newVehicle.plate.toUpperCase(),
      make: this.newVehicle.make,
      model: this.newVehicle.model,
      year: this.newVehicle.year,
      color: this.newVehicle.color,
      mileage: this.newVehicle.mileage,
      vin: this.newVehicle.vin,
      clientId: this.newVehicle.clientId || undefined,
      status: 'pending',
    });

    this.filterVehicles();
    (document.getElementById('new_vehicle_modal') as HTMLDialogElement)?.close();
  }

  resetNewVehicle(): void {
    this.newVehicle = {
      plate: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      mileage: undefined,
      vin: '',
      clientId: '',
    };
    this.hpiResult.set(false);
  }

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    const client = this.clientService.getClientById(clientId);
    return client?.name ?? 'Unknown';
  }

  getVehicleOperations(vehicleId: string) {
    return this.operationService.getVehicleOperations(vehicleId);
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

  getOperationStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      scheduled: 'status-in-progress',
      in_progress: 'status-inspection',
      completed: 'status-completed',
      cancelled: 'status-error',
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
