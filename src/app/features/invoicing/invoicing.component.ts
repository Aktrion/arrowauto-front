import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
import { concatMap, forkJoin, of } from 'rxjs';

interface InvoicingRow extends MongoEntity {
  id: string;
  vehicleInstanceId?: string;
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
  mediaUrls?: string[];
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
  private translateService = inject(TranslateService);

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

  /** All rows (unfiltered) used for computing summary counts */
  allRows = signal<InvoicingRow[]>([]);

  pendingCount = computed(() =>
    this.allRows().filter((r) => ['pending', 'scheduled', 'in_progress'].includes(r.status)).length,
  );
  readyToInvoiceCount = computed(() =>
    this.allRows().filter((r) => r.status === 'completed').length,
  );
  invoicedTodayCount = computed(() => {
    const today = new Date().toDateString();
    return this.allRows().filter(
      (r) => r.status === 'invoiced' && r.completedAt && new Date(r.completedAt).toDateString() === today,
    ).length;
  });
  totalRevenueToday = computed(() => {
    const today = new Date().toDateString();
    return this.allRows()
      .filter(
        (r) => r.status === 'invoiced' && r.completedAt && new Date(r.completedAt).toDateString() === today,
      )
      .reduce((sum, r) => sum + Number(r.total || 0), 0);
  });

  selectedItem = signal<InvoicingRow | null>(null);
  viewingImages = signal<string[]>([]);
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
      const key = row.vehicleId || row.vehicleInstanceId || row.id;
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
          icon: 'Image',
          iconLabel: 'View Photos',
          visible: (row) => Array.isArray(row.mediaUrls) && row.mediaUrls.length > 0,
          action: (row) => this.viewPhotos(row),
        },
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

    // Apply initial tab filter
    this.applyTabFilter(this.activeTab());

    this.userService.fetchUsers().subscribe((u) => this.users.set(u));
    this.clientService.fetchClients().subscribe((c) => this.clients.set(c));
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.refreshCounts();
  }

  private refreshCounts(): void {
    this.operationInstancesApi
      .searchInvoicing({ page: 1, limit: 5000 })
      .subscribe((res) => this.allRows.set((res?.data || []) as InvoicingRow[]));
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
      {
        field: 'mediaUrls',
        headerName: 'Photos',
        type: 'custom',
        sortable: false,
        filterable: false,
        dontTranslate: true,
        cellRenderer: ({ value }) => {
          const count = Array.isArray(value) ? value.length : 0;
          if (!count) return '<span class="text-base-content/30">—</span>';
          return `<span class="badge badge-info badge-sm">${count} photo${count === 1 ? '' : 's'}</span>`;
        },
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
      state.filters.status = { value: ['pending', 'scheduled', 'in_progress', 'pending_estimation', 'pending_approval'], operator: 'in' };
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
    this.applyTabFilter(tab);
    this.loadItems();
  }

  private applyTabFilter(tab: 'pending' | 'completed' | 'invoiced'): void {
    this.searchRequest.clearFilters();
    if (tab === 'pending') {
      this.searchRequest.addFilter('status', { value: ['pending', 'scheduled', 'in_progress', 'pending_estimation', 'pending_approval'], operator: 'in' });
    } else if (tab === 'completed') {
      this.searchRequest.addFilter('status', { value: 'completed', operator: 'equals' });
    } else {
      this.searchRequest.addFilter('status', { value: 'invoiced', operator: 'equals' });
    }
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
          this.refreshCounts();
        },
      });
  }

  markAsInvoiced(row: InvoicingRow): void {
    if (!row.id) return;
    this.operationInstancesApi
      .update(row.id, { status: 'invoiced' })
      .pipe(
        concatMap(() =>
          row.vehicleInstanceId
            ? this.instanceApi.update(row.vehicleInstanceId, { status: 'invoiced' } as any)
            : of(null),
        ),
      )
      .subscribe({
        next: () => {
          this.loadItems();
          this.refreshCounts();
        },
      });
  }

  invoiceSelection(): void {
    const rows = this.selectedRows();
    if (!rows.length) return;

    const opUpdates = rows
      .filter((row) => !!row.id)
      .map((row) => this.operationInstancesApi.update(row.id, { status: 'invoiced' }));

    const instanceIds = [...new Set(rows.filter((r) => !!r.vehicleInstanceId).map((r) => r.vehicleInstanceId!))];
    const instanceUpdates = instanceIds.map((id) =>
      this.instanceApi.update(id, { status: 'invoiced' } as any),
    );

    forkJoin([...opUpdates, ...instanceUpdates]).subscribe({
      next: () => {
        this.selectedRows.set([]);
        this.selectedItems = [];
        this.loadItems();
        this.refreshCounts();
      },
    });
  }

  clearSelection(): void {
    this.selectedRows.set([]);
    this.selectedItems = [];
  }

  viewPhotos(row: InvoicingRow): void {
    this.viewingImages.set(row.mediaUrls || []);
    (document.getElementById('invoicing_photos_modal') as HTMLDialogElement)?.showModal();
  }

  getClientName(clientId?: string): string {
    const walkIn = this.translateService.instant('INVOICING.WALK_IN');
    if (!clientId) return walkIn;
    return this.clientService.getClientById(this.clients(), clientId)?.name ?? walkIn;
  }

}
