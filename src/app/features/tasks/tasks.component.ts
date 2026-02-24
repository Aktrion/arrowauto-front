import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ICONS } from '@shared/icons';
import { OperationService } from '@shared/services/operation.service';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { VehicleOperation } from '@shared/models/service.model';
import { ToastService } from '@core/services/toast.service';
import { Product } from '@features/vehicles/models/vehicle.model';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit {
  private operationService = inject(OperationService);
  private instanceApi = inject(VehicleInstancesApiService);
  private notificationService = inject(ToastService);
  private router = inject(Router);
  icons = ICONS;

  vehicles = signal<Product[]>([]);
  vehicleOperations = signal<any[]>([]);
  filterStatus = signal<string>('all');
  searchQuery = signal<string>('');

  allOperations = computed(() => this.vehicleOperations());

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

  filteredOperations = computed(() => {
    let ops = this.allOperations();
    const status = this.filterStatus();

    if (status !== 'all') {
      ops = ops.filter((op) => op.status === status);
    }

    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      ops = ops.filter((op) => {
        const vehicleInfo = this.getVehicleName(op.vehicleId).toLowerCase();
        const opName = op.operation?.name?.toLowerCase() || '';
        const opCode = op.operation?.code?.toLowerCase() || '';
        return vehicleInfo.includes(query) || opName.includes(query) || opCode.includes(query);
      });
    }

    return ops;
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
    const product = this.vehicles().find((v) => v.vehicleId === vehicleId);
    if (!product?.vehicle) return vehicleId;
    return `${product.vehicle.make} ${product.vehicle.model} — ${product.vehicle.licensePlate}`;
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
    this.operationService
      .updateVehicleOperation(op.id, { status: 'in_progress' }, this.vehicleOperations())
      .subscribe({
        next: () => {
          this.notificationService.success(`Started: ${op.operation?.name}`);
          this.operationService
            .fetchData()
            .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
        },
        error: () => this.notificationService.error('Failed to start operation.'),
      });
  }

  completeOperation(op: VehicleOperation) {
    this.operationService
      .updateVehicleOperation(
        op.id,
        { status: 'completed', completedAt: new Date() },
        this.vehicleOperations(),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Completed: ${op.operation?.name}`);
          this.operationService
            .fetchData()
            .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
        },
        error: () => this.notificationService.error('Failed to complete operation.'),
      });
  }

  openVehicle(vehicleId: string) {
    this.router.navigate(['/vehicles', vehicleId]);
  }
}
