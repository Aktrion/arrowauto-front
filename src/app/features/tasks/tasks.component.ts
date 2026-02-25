import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { OperationService } from '@shared/services/operation.service';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { VehicleOperation } from '@shared/models/service.model';
import { ToastService } from '@core/services/toast.service';
import { Product } from '@features/vehicles/models/vehicle.model';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef, DataGridConfig, GridState } from '@shared/components/data-grid/data-grid.interface';

interface TaskRow {
  id: string;
  vehicleId: string;
  vehicleName: string;
  operationName: string;
  operationCode: string;
  estimatedDuration?: number;
  scheduledDate?: Date;
  scheduledTime?: string;
  status: string;
  source: VehicleOperation;
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule, DataGridComponent],
  templateUrl: './tasks.component.html',
})
export class TasksComponent {
  private operationService = inject(OperationService);
  private instanceApi = inject(VehicleInstancesApiService);
  private notificationService = inject(ToastService);
  private router = inject(Router);
  icons = ICONS;

  vehicles = signal<Product[]>([]);
  vehicleOperations = signal<VehicleOperation[]>([]);
  filterStatus = signal<string>('all');

  private currentState: GridState = {
    currentPage: 0,
    pageSize: 15,
    totalItems: 0,
    filters: {},
    quickFilter: '',
  };

  private allRows: TaskRow[] = [];

  gridConfig: DataGridConfig<TaskRow> = {
    title: 'TASKS.TITLE',
    columnDefs: this.getColumnDefinitions(),
    rowData: [],
    pageSize: 15,
    total: 0,
    currentPage: 0,
    totalPages: 0,
    loading: true,
    selectable: false,
    showNewButton: false,
    showEditButton: false,
    showDeleteButton: false,
    storageKey: 'tasks_grid',
  };

  constructor() {
    this.reloadData();
  }

  statusCounts() {
    const rows = this.allRows;
    return {
      all: rows.length,
      pending: rows.filter((o) => o.status === 'pending').length,
      scheduled: rows.filter((o) => o.status === 'scheduled').length,
      in_progress: rows.filter((o) => o.status === 'in_progress').length,
      completed: rows.filter((o) => o.status === 'completed').length,
    };
  }

  setStatusFilter(status: string): void {
    this.filterStatus.set(status);
    this.currentState.currentPage = 0;
    this.applyGridState();
  }

  handleGridStateChange(state: GridState): void {
    this.currentState = state;
    this.applyGridState();
  }

  startOperation(row: TaskRow): void {
    this.operationService
      .updateVehicleOperation(row.id, { status: 'in_progress' }, this.vehicleOperations())
      .subscribe({
        next: () => {
          this.notificationService.success(`Started: ${row.operationName}`);
          this.reloadData();
        },
        error: () => this.notificationService.error('Failed to start operation.'),
      });
  }

  completeOperation(row: TaskRow): void {
    this.operationService
      .updateVehicleOperation(
        row.id,
        { status: 'completed', completedAt: new Date() },
        this.vehicleOperations(),
      )
      .subscribe({
        next: () => {
          this.notificationService.success(`Completed: ${row.operationName}`);
          this.reloadData();
        },
        error: () => this.notificationService.error('Failed to complete operation.'),
      });
  }

  openVehicle(row: TaskRow): void {
    if (!row.vehicleId) return;
    this.router.navigate(['/vehicles-instances', row.vehicleId]);
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

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private reloadData(): void {
    this.gridConfig.loading = true;
    forkJoin({
      vehicles: this.instanceApi.findByPagination({
        page: 1,
        limit: 500,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      opsData: this.operationService.fetchData(),
    }).subscribe({
      next: ({ vehicles, opsData }) => {
        this.vehicles.set(vehicles.data ?? []);
        this.vehicleOperations.set((opsData.vehicleOperations || []) as VehicleOperation[]);
        this.allRows = (opsData.vehicleOperations || []).map((op: VehicleOperation) => ({
          id: op.id,
          vehicleId: op.vehicleId,
          vehicleName: this.getVehicleName(op.vehicleId, vehicles.data ?? []),
          operationName: op.operation?.name || '',
          operationCode: op.operation?.code || '',
          estimatedDuration: op.operation?.estimatedDuration,
          scheduledDate: op.scheduledDate ? new Date(op.scheduledDate) : undefined,
          scheduledTime: op.scheduledTime,
          status: op.status,
          source: op,
        }));
        this.applyGridState();
        this.gridConfig.loading = false;
      },
      error: () => {
        this.allRows = [];
        this.applyGridState();
        this.gridConfig.loading = false;
      },
    });
  }

  private applyGridState(): void {
    const search = (this.currentState.quickFilter || '').trim().toLowerCase();
    const status = this.filterStatus();
    let rows = [...this.allRows];

    if (status !== 'all') {
      rows = rows.filter((row) => row.status === status);
    }

    if (search) {
      rows = rows.filter(
        (row) =>
          row.vehicleName.toLowerCase().includes(search) ||
          row.operationName.toLowerCase().includes(search) ||
          row.operationCode.toLowerCase().includes(search) ||
          row.status.toLowerCase().includes(search),
      );
    }

    const pageSize = this.currentState.pageSize || 15;
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(this.currentState.currentPage || 0, totalPages - 1);
    const start = currentPage * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    this.gridConfig = {
      ...this.gridConfig,
      rowData: pageRows,
      total: totalItems,
      currentPage,
      totalPages,
      pageSize,
      customActions: [
        {
          icon: 'ExternalLink',
          iconLabel: 'Open',
          action: (row) => this.openVehicle(row),
        },
        {
          icon: 'Zap',
          iconLabel: 'Start',
          visible: (row) => row.status === 'pending' || row.status === 'scheduled',
          action: (row) => this.startOperation(row),
        },
        {
          icon: 'CircleCheckBig',
          iconLabel: 'Complete',
          visible: (row) => row.status === 'in_progress',
          action: (row) => this.completeOperation(row),
        },
      ],
    };
  }

  private getVehicleName(vehicleId: string, vehicles: Product[]): string {
    const product = vehicles.find((v) => v.vehicleId === vehicleId);
    if (!product?.vehicle) return vehicleId;
    return `${product.vehicle.make} ${product.vehicle.model} - ${product.vehicle.licensePlate}`;
  }

  private getColumnDefinitions(): ColumnDef[] {
    return [
      { field: 'operationName', headerName: 'Operation', type: 'string', sortable: true, filterable: true, dontTranslate: true },
      { field: 'operationCode', headerName: 'Code', type: 'string', sortable: true, filterable: true, dontTranslate: true },
      { field: 'vehicleName', headerName: 'Vehicle', type: 'string', sortable: true, filterable: true, dontTranslate: true },
      { field: 'estimatedDuration', headerName: 'Duration', type: 'number', sortable: true, filterable: false, dontTranslate: true },
      { field: 'scheduledDate', headerName: 'Scheduled', type: 'date', sortable: true, filterable: false, dontTranslate: true },
      {
        field: 'status',
        headerName: 'Status',
        type: 'string',
        sortable: true,
        filterable: true,
        dontTranslate: true,
        cellRenderer: ({ value }) => this.formatStatus(value),
      },
    ];
  }
}
