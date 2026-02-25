import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { OperationService } from '@shared/services/operation.service';
import { ToastService } from '@core/services/toast.service';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { OperationInstancesApiService } from '@shared/services/api/operation-instances-api.service';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';

interface TaskRow {
  id: string;
  vehicleId: string;
  vehicleInstanceId?: string;
  vehicleName: string;
  operationName: string;
  operationCode: string;
  estimatedDuration?: number;
  scheduledDate?: Date;
  scheduledTime?: string;
  status: string;
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule, DataGridComponent],
  templateUrl: './tasks.component.html',
})
export class TasksComponent extends BaseListDirective<
  TaskRow,
  Record<string, unknown>,
  Record<string, unknown>
> {
  private operationService = inject(OperationService);
  private notificationService = inject(ToastService);
  private router = inject(Router);
  icons = ICONS;

  filterStatus = signal<string>('all');
  taskCounts = signal({ all: 0, pending: 0, scheduled: 0, in_progress: 0, completed: 0 });

  constructor() {
    const api = inject(OperationInstancesApiService);
    super(api as any, (params) =>
      api.searchTasks(params).pipe(
        tap((res: any) => {
          if (res?.counts) this.taskCounts.set(res.counts);
        }),
      ),
    );

    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'Wrench',
      selectable: false,
      showNewButton: false,
      showEditButton: false,
      showDeleteButton: false,
      storageKey: 'tasks_grid',
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

  protected getTitle(): string {
    return 'TASKS.TITLE';
  }

  protected getColumnDefinitions(): ColumnDef[] {
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
        cellRenderer: ({ value }) => VehicleStatusUtils.statusBadge(value),
      },
    ];
  }

  setStatusFilter(status: string): void {
    this.filterStatus.set(status);
    this.searchRequest.clearFilters();
    if (status !== 'all') {
      this.searchRequest.addFilter('status', { value: status, operator: 'equals' });
    }
    this.searchRequest.page = 1;
    this.loadItems();
  }

  override handleGridStateChange(state: any): void {
    const status = this.filterStatus();
    state.filters = state.filters || {};
    if (status !== 'all') {
      state.filters.status = { value: status, operator: 'equals' };
    }
    super.handleGridStateChange(state);
  }

  startOperation(row: TaskRow): void {
    this.operationService
      .updateVehicleOperation(row.id, { status: 'in_progress' }, [])
      .subscribe({
        next: () => {
          this.notificationService.success(`Started: ${row.operationName}`);
          this.loadItems();
        },
        error: () => this.notificationService.error('Failed to start operation.'),
      });
  }

  completeOperation(row: TaskRow): void {
    this.operationService
      .updateVehicleOperation(row.id, { status: 'completed', completedAt: new Date() }, [])
      .subscribe({
        next: () => {
          this.notificationService.success(`Completed: ${row.operationName}`);
          this.loadItems();
        },
        error: () => this.notificationService.error('Failed to complete operation.'),
      });
  }

  openVehicle(row: TaskRow): void {
    const instanceId = row.vehicleInstanceId || row.vehicleId;
    if (!instanceId) return;
    this.router.navigate(['/vehicles-instances', instanceId]);
  }

  formatStatus(status: string): string {
    return (status ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
