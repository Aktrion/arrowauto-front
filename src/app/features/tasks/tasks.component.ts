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
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './tasks.component.html',
})
export class TasksComponent {
  private operationService = inject(OperationService);
  private vehicleService = inject(VehicleService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  icons = ICONS;

  filterStatus = signal<string>('all');

  allOperations = computed(() => this.operationService.vehicleOperations());

  filteredOperations = computed(() => {
    const ops = this.allOperations();
    const status = this.filterStatus();
    if (status === 'all') return ops;
    return ops.filter((op) => op.status === status);
  });

  statusCounts = computed(() => {
    const ops = this.allOperations();
    return {
      all: ops.length,
      pending: ops.filter((o) => o.status === 'pending').length,
      scheduled: ops.filter((o) => o.status === 'scheduled').length,
      in_progress: ops.filter((o) => o.status === 'in_progress').length,
      completed: ops.filter((o) => o.status === 'completed').length,
    };
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
      completed: 'badge-success',
      invoiced: 'badge-secondary',
      cancelled: 'badge-error',
    };
    return map[status] || 'badge-ghost';
  }

  startOperation(op: VehicleOperation) {
    this.operationService.updateVehicleOperation(op.id, { status: 'in_progress' }).subscribe({
      next: () => this.notificationService.success(`Started: ${op.operation?.name}`),
      error: () => this.notificationService.error('Failed to start operation.'),
    });
  }

  completeOperation(op: VehicleOperation) {
    this.operationService
      .updateVehicleOperation(op.id, {
        status: 'completed',
        completedAt: new Date(),
      })
      .subscribe({
        next: () => this.notificationService.success(`Completed: ${op.operation?.name}`),
        error: () => this.notificationService.error('Failed to complete operation.'),
      });
  }

  openVehicle(vehicleId: string) {
    this.router.navigate(['/vehicles', vehicleId]);
  }
}
