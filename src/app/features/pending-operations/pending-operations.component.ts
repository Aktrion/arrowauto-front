import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '../../shared/icons';
import { OperationService } from '../../shared/services/service.service';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { VehicleOperation } from '../../shared/models';

@Component({
  selector: 'app-pending-operations',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './pending-operations.component.html',
})
export class PendingOperationsComponent {
  private operationService = inject(OperationService);
  private vehicleService = inject(VehicleService);
  private router = inject(Router);
  icons = ICONS;

  searchQuery = signal<string>('');

  allOperations = computed(() => this.operationService.vehicleOperations());

  pendingOperations = computed(() => {
    const ops = this.allOperations().filter((op) =>
      ['pending', 'scheduled', 'in_progress'].includes(op.status),
    );
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return ops;

    return ops.filter((op) => {
      const opName = op.operation?.name?.toLowerCase() || '';
      const opCode = op.operation?.code?.toLowerCase() || '';
      const vehicle = this.getVehicleName(op.vehicleId).toLowerCase();
      return opName.includes(query) || opCode.includes(query) || vehicle.includes(query);
    });
  });

  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicleService.getVehicleById(vehicleId);
    if (!vehicle?.vehicle) return vehicleId;
    return `${vehicle.vehicle.make} ${vehicle.vehicle.model} — ${vehicle.vehicle.licensePlate}`;
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-warning',
      scheduled: 'badge-info',
      in_progress: 'badge-primary',
    };
    return map[status] || 'badge-ghost';
  }

  openVehicle(vehicleId: string) {
    this.router.navigate(['/vehicles', vehicleId]);
  }
}
