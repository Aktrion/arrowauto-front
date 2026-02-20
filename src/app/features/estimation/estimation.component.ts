import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '../../shared/icons';
import { OperationService } from '../../shared/services/service.service';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { VehicleOperation } from '../../shared/models';
import { NotificationService } from '../../core/services/notification.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-estimation',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './estimation.component.html',
})
export class EstimationComponent {
  private operationService = inject(OperationService);
  private vehicleService = inject(VehicleService);
  private notificationService = inject(NotificationService);
  private http = inject(HttpClient);
  private communicationsApiUrl = `${environment.apiUrl}/customer-communications`;
  icons = ICONS;

  sendingVehicle = signal<string | null>(null);

  // Group completed operations by vehicle for estimation
  vehicleGroups = computed(() => {
    const ops = this.operationService
      .vehicleOperations()
      .filter((o) => o.status === 'completed' || o.status === 'in_progress');

    const grouped = new Map<
      string,
      { vehicleName: string; licensePlate: string; operations: VehicleOperation[] }
    >();
    ops.forEach((op) => {
      if (!grouped.has(op.vehicleId)) {
        const vehicle = this.vehicleService.getVehicleById(op.vehicleId);
        grouped.set(op.vehicleId, {
          vehicleName: vehicle?.vehicle
            ? `${vehicle.vehicle.make} ${vehicle.vehicle.model}`
            : op.vehicleId,
          licensePlate: vehicle?.vehicle?.licensePlate || '',
          operations: [],
        });
      }
      grouped.get(op.vehicleId)!.operations.push(op);
    });
    return Array.from(grouped.entries()).map(([vehicleId, data]) => ({
      vehicleId,
      ...data,
    }));
  });

  editingPrices = signal<Record<string, number>>({});

  getEstimatedCost(op: VehicleOperation): number {
    const saved = this.editingPrices()[op.id];
    if (saved !== undefined) return saved;
    return op.actualPrice ?? op.hourlyRate ?? op.operation?.defaultPrice ?? 0;
  }

  getTotalForGroup(operations: VehicleOperation[]): number {
    return operations.reduce((sum, op) => sum + this.getEstimatedCost(op), 0);
  }

  getGrandTotal(): number {
    return this.vehicleGroups().reduce(
      (sum, group) => sum + this.getTotalForGroup(group.operations),
      0,
    );
  }

  updatePrice(opId: string, value: number) {
    this.editingPrices.update((p) => ({ ...p, [opId]: value }));
  }

  saveEstimation(op: VehicleOperation) {
    const price = this.getEstimatedCost(op);
    this.operationService.updateVehicleOperation(op.id, { actualPrice: price }).subscribe({
      next: () => this.notificationService.success('Price updated.'),
      error: () => this.notificationService.error('Failed to save price.'),
    });
  }

  saveAllForVehicle(vehicleId: string, operations: VehicleOperation[]) {
    let count = 0;
    operations.forEach((op) => {
      const price = this.getEstimatedCost(op);
      this.operationService.updateVehicleOperation(op.id, { actualPrice: price }).subscribe({
        next: () => {
          count++;
          if (count === operations.length) {
            this.notificationService.success('All prices saved for this vehicle.');
          }
        },
      });
    });
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

  sendToClient(vehicleId: string, operations: VehicleOperation[]) {
    this.sendingVehicle.set(vehicleId);
    const vehicle = this.vehicleService.getVehicleById(vehicleId);
    const vehicleName = vehicle?.vehicle
      ? `${vehicle.vehicle.make} ${vehicle.vehicle.model}`
      : vehicleId;
    const total = this.getTotalForGroup(operations);
    const productId = this.vehicleService.getProductIdByVehicleId(vehicleId);
    if (!productId) {
      this.notificationService.error('Cannot find vehicle instance for this vehicle.');
      this.sendingVehicle.set(null);
      return;
    }

    const lineItems = operations.map((op) => ({
      operation: op.operation?.name || 'Unknown',
      price: this.getEstimatedCost(op),
    }));

    const payload = {
      productId,
      type: 'estimation',
      content: JSON.stringify({
        vehicleName,
        licensePlate: vehicle?.vehicle?.licensePlate || '',
        lineItems,
        total,
      }),
      sentAt: new Date().toISOString(),
      recipient: 'client',
      status: 'sent',
    };

    this.http.post(this.communicationsApiUrl, payload).subscribe({
      next: () => {
        // Update vehicle instance status to pending_approval
        this.vehicleService
          .updateProductStatusByVehicleId(vehicleId, 'pending_approval' as any)
          .subscribe({
            next: () => {
              this.notificationService.success(`Estimation sent to client for ${vehicleName}.`);
              this.sendingVehicle.set(null);
            },
            error: () => {
              this.notificationService.success(`Estimation sent. Status update pending.`);
              this.sendingVehicle.set(null);
            },
          });
      },
      error: () => {
        this.notificationService.error('Failed to send estimation.');
        this.sendingVehicle.set(null);
      },
    });
  }
}
