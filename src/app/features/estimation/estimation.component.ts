import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { OperationService } from '@shared/services/operation.service';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { CustomerCommunicationsApiService } from '@features/estimation/services/api/customer-communications-api.service';
import { VehicleOperation } from '@shared/models/service.model';
import { ToastService } from '@core/services/toast.service';
import { Product } from '@features/vehicles/models/vehicle.model';

@Component({
  selector: 'app-estimation',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './estimation.component.html',
})
export class EstimationComponent implements OnInit {
  private operationService = inject(OperationService);
  private instanceApi = inject(VehicleInstancesApiService);
  private toastService = inject(ToastService);
  private communicationsApi = inject(CustomerCommunicationsApiService);
  icons = ICONS;

  vehicles = signal<Product[]>([]);
  vehicleOperations = signal<any[]>([]);
  sendingVehicle = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      vehicles: this.instanceApi.findByPagination({
        page: 1,
        limit: 500,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      opsData: this.operationService.fetchData(),
    }).subscribe(({ vehicles, opsData }) => {
      this.vehicles.set(vehicles.data ?? []);
      this.vehicleOperations.set(opsData.vehicleOperations);
    });
  }

  vehicleGroups = computed(() => {
    const ops = this.vehicleOperations().filter(
      (o) => o.status === 'completed' || o.status === 'in_progress',
    );
    const vehicles = this.vehicles();

    const grouped = new Map<
      string,
      { vehicleName: string; licensePlate: string; operations: VehicleOperation[] }
    >();
    ops.forEach((op) => {
      if (!grouped.has(op.vehicleId)) {
        const product = vehicles.find((v) => v.vehicleId === op.vehicleId);
        grouped.set(op.vehicleId, {
          vehicleName: product?.vehicle
            ? `${product.vehicle.make} ${product.vehicle.model}`
            : op.vehicleId,
          licensePlate: product?.vehicle?.licensePlate || '',
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
    this.operationService
      .updateVehicleOperation(op.id, { actualPrice: price }, this.vehicleOperations())
      .subscribe({
        next: () => {
          this.toastService.success('Price updated.');
          this.operationService
            .fetchData()
            .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
        },
        error: () => this.toastService.error('Failed to save price.'),
      });
  }

  saveAllForVehicle(vehicleId: string, operations: VehicleOperation[]) {
    let count = 0;
    const refresh = () => {
      count++;
      if (count === operations.length) {
        this.toastService.success('All prices saved for this vehicle.');
        this.operationService
          .fetchData()
          .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
      }
    };
    operations.forEach((op) => {
      const price = this.getEstimatedCost(op);
      this.operationService
        .updateVehicleOperation(op.id, { actualPrice: price }, this.vehicleOperations())
        .subscribe({ next: refresh });
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
    const product = this.vehicles().find((v) => v.vehicleId === vehicleId);
    const vehicleName = product?.vehicle
      ? `${product.vehicle.make} ${product.vehicle.model}`
      : vehicleId;
    const total = this.getTotalForGroup(operations);
    this.instanceApi.findInstanceByVehicleId(vehicleId).subscribe({
      next: (instance) => {
        const productId = instance?._id;
        if (!productId) {
          this.toastService.error('Cannot find vehicle instance for this vehicle.');
          this.sendingVehicle.set(null);
          return;
        }
        const licensePlate =
          product?.vehicle?.licensePlate || instance?.vehicle?.licensePlate || '';
        this.doSendToClient(productId, vehicleName, licensePlate, operations, total);
      },
      error: () => {
        this.toastService.error('Cannot find vehicle instance for this vehicle.');
        this.sendingVehicle.set(null);
      },
    });
  }

  private doSendToClient(
    productId: string,
    vehicleName: string,
    licensePlate: string,
    operations: VehicleOperation[],
    total: number,
  ) {
    const lineItems = operations.map((op) => ({
      operation: op.operation?.name || 'Unknown',
      price: this.getEstimatedCost(op),
    }));

    const payload = {
      productId,
      type: 'estimation',
      content: JSON.stringify({
        vehicleName,
        licensePlate,
        lineItems,
        total,
      }),
      sentAt: new Date().toISOString(),
      recipient: 'client',
      status: 'sent',
    };

    this.communicationsApi.create(payload as Record<string, unknown>).subscribe({
      next: () => {
        this.instanceApi.update(productId, { status: 'awaiting_approval' } as any).subscribe({
          next: () => {
            this.toastService.success(`Estimation sent to client for ${vehicleName}.`);
            this.sendingVehicle.set(null);
          },
          error: () => {
            this.toastService.success(`Estimation sent. Status update pending.`);
            this.sendingVehicle.set(null);
          },
        });
      },
      error: () => {
        this.toastService.error('Failed to send estimation.');
        this.sendingVehicle.set(null);
      },
    });
  }
}
