import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { ClientService } from '@features/clients/services/client.service';
import { UserService } from '@core/services/user.service';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { licensePlateBadge } from '@shared/utils/license-plate.utils';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { MongoEntity } from '@shared/models/mongo-entity.model';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { OperationInstancesApiService } from '@shared/services/api/operation-instances-api.service';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';

interface InvoicingRow extends MongoEntity {
  id: string;
  productId?: string;
  customerId?: string;
  vehicleId?: string;
  job: string;
  plate: string;
  vehicle: string;
  operation: string;
  status: string;
  duration: number;
  rate: number;
  total: number;
  completedAt?: string | Date;
}

@Component({
  selector: 'app-invoicing',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DataGridComponent, SelectComponent, TranslateModule],
  templateUrl: './invoicing.component.html',
})
export class InvoicingComponent extends BaseListDirective<
  InvoicingRow,
  Partial<InvoicingRow>,
  Partial<InvoicingRow>
> {
  icons = ICONS;
  private instanceApi = inject(VehicleInstancesApiService);
  private operationInstancesApi = inject(OperationInstancesApiService);
  private userService = inject(UserService);
  private clientService = inject(ClientService);

  activeTab = signal<'pending' | 'completed' | 'invoiced'>('pending');
  selectedRows = signal<InvoicingRow[]>([]);
  users = signal<any[]>([]);
  clients = signal<any[]>([]);
  operators = computed(() => this.userService.getOperators(this.users()));
  operatorSelectOptions = computed<SelectOption[]>(() =>
    this.operators().map((op: any) => ({
      label: op.name,
      value: op.id,
    })),
  );

  pendingCount = computed(() => this.tabCounts().pending);
  readyToInvoiceCount = computed(() => this.tabCounts().completed);
  invoicedTodayCount = computed(() => {
    const today = new Date().toDateString();
    return this.gridConfig.rowData.filter((row) => {
      if (row.status !== 'invoiced') return false;
      if (!row.completedAt) return false;
      return new Date(row.completedAt).toDateString() === today;
    }).length;
  });
  totalRevenueToday = computed(() => {
    const today = new Date().toDateString();
    return this.gridConfig.rowData
      .filter(
        (row) =>
          row.status === 'invoiced' &&
          row.completedAt &&
          new Date(row.completedAt).toDateString() === today,
      )
      .reduce((sum, row) => sum + Number(row.total || 0), 0);
  });

  selectedItem = signal<InvoicingRow | null>(null);
  completeForm = {
    operatorId: '',
    duration: 0,
    hourlyRate: 45,
    notes: '',
  };

  invoicePreviewData = computed(() => {
    const selected = this.selectedRows();
    if (!selected.length) return null;
    const total = selected.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const tax = total * 0.21;

    const byVehicle = new Map<string, InvoicingRow[]>();
    selected.forEach((row) => {
      const key = row.vehicleId || row.productId || row.id;
      const list = byVehicle.get(key) || [];
      list.push(row);
      byVehicle.set(key, list);
    });

    const groups = Array.from(byVehicle.values()).map((rows) => ({
      vehicle: {
        licensePlate: rows[0].plate,
        make: rows[0].vehicle.split(' ')[0] || '',
        model: rows[0].vehicle.split(' ').slice(1).join(' ') || '',
      },
      client: this.getClientName(rows[0].customerId),
      operations: rows,
      vehicleTotal: rows.reduce((sum, r) => sum + Number(r.total || 0), 0),
    }));

    return {
      groups,
      subtotal: total,
      tax,
      grandTotal: total + tax,
      invoiceNumber: 'INV-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date(),
    };
  });

  constructor() {
    const operationInstancesApi = inject(OperationInstancesApiService);
    super(operationInstancesApi as any, (params) => operationInstancesApi.searchInvoicing(params));

    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'FileText',
      showNewButton: false,
      showEditButton: false,
      showDeleteButton: false,
      selectable: true,
      storageKey: 'invoicing_grid',
      customActions: [
        {
          icon: 'CircleCheckBig',
          iconLabel: 'Complete',
          visible: (row) => row.status !== 'completed' && row.status !== 'invoiced',
          action: (row) => this.openCompleteModal(row),
        },
        {
          icon: 'FileText',
          iconLabel: 'Invoice',
          visible: (row) => row.status === 'completed',
          action: (row) => this.markAsInvoiced(row),
        },
      ],
    };

    this.userService.fetchUsers().subscribe((u) => this.users.set(u));
    this.clientService.fetchClients().subscribe((c) => this.clients.set(c));
  }

  protected getTitle(): string {
    return 'INVOICING.TITLE';
  }

  protected getColumnDefinitions(): ColumnDef[] {
    return [
      {
        field: 'job',
        headerName: 'Job #',
        type: 'string',
        sortable: true,
        filterable: true,
        dontTranslate: true,
      },
      {
        field: 'plate',
        headerName: 'Plate',
        type: 'string',
        sortable: true,
        filterable: true,
        dontTranslate: true,
        cellRenderer: ({ value }) => licensePlateBadge(value),
      },
      {
        field: 'vehicle',
        headerName: 'Vehicle',
        type: 'string',
        sortable: true,
        filterable: true,
        dontTranslate: true,
      },
      {
        field: 'operation',
        headerName: 'Operation',
        type: 'string',
        sortable: true,
        filterable: true,
        dontTranslate: true,
      },
      {
        field: 'duration',
        headerName: 'Duration',
        type: 'number',
        sortable: true,
        filterable: false,
        dontTranslate: true,
      },
      {
        field: 'rate',
        headerName: 'Rate',
        type: 'number',
        sortable: true,
        filterable: false,
        dontTranslate: true,
      },
      {
        field: 'total',
        headerName: 'Total',
        type: 'number',
        sortable: true,
        filterable: false,
        dontTranslate: true,
        cellRenderer: ({ value }) => `£${Number(value || 0).toFixed(2)}`,
      },
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

  override handleSelectionChanged(rows: InvoicingRow[]): void {
    super.handleSelectionChanged(rows);
    this.selectedRows.set(rows);
  }

  override handleGridStateChange(state: any): void {
    const tab = this.activeTab();
    state.filters = state.filters || {};
    if (tab === 'pending') {
      state.filters.status = { value: ['pending', 'scheduled', 'in_progress'], operator: 'in' };
    } else if (tab === 'completed') {
      state.filters.status = { value: 'completed', operator: 'equals' };
    } else {
      state.filters.status = { value: 'invoiced', operator: 'equals' };
    }
    super.handleGridStateChange(state);
  }

  setTab(tab: 'pending' | 'completed' | 'invoiced'): void {
    this.activeTab.set(tab);
    this.selectedRows.set([]);
    this.searchRequest.page = 1;
    this.loadItems();
  }

  openCompleteModal(row: InvoicingRow): void {
    this.selectedItem.set(row);
    this.completeForm = {
      operatorId: '',
      duration: row.duration || 0,
      hourlyRate: row.rate || 45,
      notes: '',
    };
    (document.getElementById('complete_modal') as HTMLDialogElement)?.showModal();
  }

  calculateCompleteTotal(): number {
    if (!this.completeForm.duration || !this.completeForm.hourlyRate) return 0;
    return (this.completeForm.duration / 60) * this.completeForm.hourlyRate;
  }

  completeOperation(): void {
    const item = this.selectedItem();
    if (!item?.id) return;
    this.operationInstancesApi
      .update(item.id, {
        status: 'completed',
        timeTaken: this.completeForm.duration,
        ratePerHour: this.completeForm.hourlyRate,
        assignedUser: this.completeForm.operatorId || undefined,
        labourDescription: this.completeForm.notes || undefined,
        performedDate: new Date(),
      })
      .subscribe({
        next: () => {
          (document.getElementById('complete_modal') as HTMLDialogElement)?.close();
          this.loadItems();
        },
      });
  }

  markAsInvoiced(row: InvoicingRow): void {
    if (!row.id) return;
    this.operationInstancesApi.update(row.id, { status: 'invoiced' }).subscribe({
      next: () => {
        if (row.productId) {
          this.instanceApi.update(row.productId, { status: 'invoiced' } as any).subscribe();
        }
        this.loadItems();
      },
    });
  }

  invoiceSelection(): void {
    const rows = this.selectedRows();
    if (!rows.length) return;
    rows.forEach((row) => {
      if (!row.id) return;
      this.operationInstancesApi.update(row.id, { status: 'invoiced' }).subscribe();
      if (row.productId) {
        this.instanceApi.update(row.productId, { status: 'invoiced' } as any).subscribe();
      }
    });
    this.selectedRows.set([]);
    this.selectedItems = [];
    this.loadItems();
  }

  clearSelection(): void {
    this.selectedRows.set([]);
    this.selectedItems = [];
  }

  getClientName(clientId?: string): string {
    if (!clientId) return 'Walk-in Client';
    return this.clientService.getClientById(this.clients(), clientId)?.name ?? 'Walk-in Client';
  }

  private tabCounts() {
    const rows = this.gridConfig.rowData || [];
    return {
      pending: rows.filter((r) => ['pending', 'scheduled', 'in_progress'].includes(r.status))
        .length,
      completed: rows.filter((r) => r.status === 'completed').length,
    };
  }
}
