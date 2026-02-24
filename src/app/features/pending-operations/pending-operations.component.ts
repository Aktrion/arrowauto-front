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

  getVehicleName(instanceId: string): string {
    const instance = this.vehicleService.getVehicleById(instanceId);
    if (!instance?.vehicle) return instanceId;
    return `${instance.vehicle.make} ${instance.vehicle.model} — ${instance.vehicle.licensePlate}`;
  }

  // Service Helpers
  formatStatus = (s: string) => this.vehicleService.formatStatus(s);

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-warning',
      scheduled: 'badge-info',
      in_progress: 'badge-primary',
    };
    return map[status] || 'badge-ghost';
  }

  openVehicle(instanceId: string) {
    this.router.navigate(['/vehicles-instances', instanceId]);
  }
}
