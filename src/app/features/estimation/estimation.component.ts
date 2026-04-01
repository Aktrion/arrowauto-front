import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { map, concatMap } from 'rxjs';
import { ICONS } from '@shared/icons';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { CustomerCommunicationsApiService } from '@features/estimation/services/api/customer-communications-api.service';
import { ToastService } from '@core/services/toast.service';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { licensePlateBadge } from '@shared/utils/license-plate.utils';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';
import { ColumnDef, DataGridConfig } from '@shared/components/data-grid/data-grid.interface';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { MongoEntity } from '@shared/models/mongo-entity.model';
import { OperationInstancesApiService } from '@shared/services/api/operation-instances-api.service';

interface EstimationRow extends MongoEntity {
  id: string;
  vehicleInstanceId?: string;
  vehicleId?: string;
  vehicleName: string;
  licensePlate: string;
  code?: string;
  operation: string;
  status: string;
  duration: number;
  price: number;
  mediaUrls?: string[];
}

interface VehicleGroupRow {
  id: string;
  vehicleInstanceId: string;
  vehicleName: string;
  licensePlate: string;
  code: string;
  operationsCount: number;
  totalEstimated: number;
  operations: EstimationRow[];
}

function groupByVehicle(flat: EstimationRow[]): VehicleGroupRow[] {
  const map = new Map<string, VehicleGroupRow>();
  for (const row of flat) {
    const vid = row.vehicleInstanceId ?? row.id;
    if (!map.has(vid)) {
      map.set(vid, {
        id: vid,
        vehicleInstanceId: vid,
        vehicleName: row.vehicleName || '—',
        licensePlate: row.licensePlate || '',
        code: row.code || '',
        operationsCount: 0,
        totalEstimated: 0,
        operations: [],
      });
    }
    const group = map.get(vid)!;
    group.operations.push(row);
    group.operationsCount++;
    group.totalEstimated += Number(row.price || 0);
  }
  return Array.from(map.values());
}

@Component({
  selector: 'app-estimation',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DataGridComponent, TranslateModule],
  templateUrl: './estimation.component.html',
})
export class EstimationComponent extends BaseListDirective<
  VehicleGroupRow,
  Partial<VehicleGroupRow>,
  Partial<VehicleGroupRow>
> {
  private readonly instanceApi = inject(VehicleInstancesApiService);
  private readonly toastService = inject(ToastService);
  private readonly communicationsApi = inject(CustomerCommunicationsApiService);
  private readonly operationInstancesApi = inject(OperationInstancesApiService);

  icons = ICONS;
  licensePlateBadge = licensePlateBadge;

  selectedVehicle = signal<VehicleGroupRow | null>(null);
  editingPrices = signal<Record<string, number>>({});
  sendingVehicle = signal<string | null>(null);
  priceModalRow = signal<EstimationRow | null>(null);
  priceInputValue = signal<number>(0);
  viewingImages = signal<string[]>([]);

  /** Grand total across all vehicles — recalculated on each CD cycle from gridConfig.rowData */
  get grandTotal(): number {
    return (this.gridConfig.rowData as VehicleGroupRow[]).reduce(
      (sum, g) => sum + g.totalEstimated,
      0,
    );
  }

  /** Operations detail grid config — reactive to selectedVehicle + editingPrices */
  detailGridConfig = computed<DataGridConfig<EstimationRow>>(() => {
    const ops = this.selectedVehicle()?.operations ?? [];
    const prices = this.editingPrices(); // reactive dep so prices re-render
    return {
      columnDefs: this.getDetailColumnDefs(prices),
      rowData: ops,
      pageSize: 100,
      total: ops.length,
      currentPage: 0,
      totalPages: 1,
      loading: false,
      selectable: false,
      showNewButton: false,
      showEditButton: false,
      showDeleteButton: false,
      storageKey: 'estimation_detail_grid',
      customActions: [
        {
          icon: 'Image',
          iconLabel: 'View Photos',
          visible: (row: EstimationRow) => Array.isArray(row.mediaUrls) && row.mediaUrls.length > 0,
          action: (row: EstimationRow) => this.viewPhotos(row),
        },
        {
          icon: 'DollarSign',
          iconLabel: 'Set Price',
          action: (row: EstimationRow) => this.openPriceModal(row),
        },
      ],
    };
  });

  constructor() {
    const operationInstancesApi = inject(OperationInstancesApiService);
    super(
      operationInstancesApi as any,
      () =>
        operationInstancesApi
          .searchEstimation({
            page: 1,
            limit: 1000,
            filters: {
              status: { value: ['pending_estimation', 'pending_approval'], operator: 'in' },
            },
          })
          .pipe(
            map((res) => {
              const flat = (res?.data ?? []) as EstimationRow[];
              const groups = groupByVehicle(flat);
              return {
                data: groups,
                total: groups.length,
                page: 1,
                pages: 1,
                totalPages: 1,
                limit: groups.length,
              };
            }),
          ),
    );

    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'DollarSign',
      storageKey: 'estimation_vehicle_grid',
      showNewButton: false,
      showEditButton: false,
      showDeleteButton: false,
      selectable: false,
      customActions: [
        {
          icon: 'ClipboardList',
          iconLabel: 'View operations',
          action: (group: VehicleGroupRow) => this.openDetail(group),
        },
        {
          icon: 'Send',
          iconLabel: 'Send to client',
          action: (group: VehicleGroupRow) => this.sendVehicle(group),
        },
      ],
    };
  }

  protected getTitle(): string {
    return 'ESTIMATION.TITLE';
  }

  protected getColumnDefinitions(): ColumnDef[] {
    return [
      {
        field: 'code',
        headerName: 'Job Number',
        type: 'string',
        sortable: true,
        filterable: true,
        dontTranslate: true,
      },
      {
        field: 'vehicleName',
        headerName: 'Vehicle',
        type: 'string',
        sortable: true,
        filterable: true,
        dontTranslate: true,
      },
      {
        field: 'licensePlate',
        headerName: 'License Plate',
        type: 'string',
        sortable: true,
        filterable: true,
        dontTranslate: true,
        cellRenderer: ({ value }) => licensePlateBadge(value),
      },
      {
        field: 'operationsCount',
        headerName: 'Operations',
        type: 'number',
        sortable: true,
        filterable: false,
        dontTranslate: true,
      },
      {
        field: 'totalEstimated',
        headerName: 'Estimated Total',
        type: 'number',
        sortable: true,
        filterable: false,
        dontTranslate: true,
        cellRenderer: ({ value }) => `£${Number(value ?? 0).toFixed(2)}`,
      },
    ];
  }

  private getDetailColumnDefs(_prices: Record<string, number>): ColumnDef[] {
    return [
      {
        field: 'operation',
        headerName: 'Operation',
        type: 'string',
        sortable: true,
        filterable: true,
        dontTranslate: true,
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
        field: 'duration',
        headerName: 'Duration (min)',
        type: 'number',
        sortable: true,
        filterable: false,
        dontTranslate: true,
      },
      {
        field: 'price',
        headerName: 'Price',
        type: 'number',
        sortable: true,
        filterable: false,
        dontTranslate: true,
        cellRenderer: ({ data }) => `£${this.getEstimatedCost(data).toFixed(2)}`,
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

  viewPhotos(row: EstimationRow): void {
    this.viewingImages.set(row.mediaUrls || []);
    (document.getElementById('estimation_photos_modal') as HTMLDialogElement)?.showModal();
  }

  // ── Navigation ────────────────────────────────────────────────

  openDetail(group: VehicleGroupRow): void {
    this.selectedVehicle.set(group);
  }

  closeDetail(): void {
    this.selectedVehicle.set(null);
  }

  // ── Price ─────────────────────────────────────────────────────

  getEstimatedCost(row: EstimationRow): number {
    const saved = this.editingPrices()[row.id];
    return saved !== undefined ? saved : Number(row.price ?? 0);
  }

  openPriceModal(row: EstimationRow): void {
    this.priceModalRow.set(row);
    this.priceInputValue.set(this.getEstimatedCost(row));
    (document.getElementById('price_modal') as HTMLDialogElement)?.showModal();
  }

  closePriceModal(): void {
    this.priceModalRow.set(null);
    (document.getElementById('price_modal') as HTMLDialogElement)?.close();
  }

  confirmPrice(): void {
    const row = this.priceModalRow();
    if (!row) return;
    const price = Number(this.priceInputValue());
    if (Number.isNaN(price) || price < 0) {
      this.toastService.error('Invalid price.');
      return;
    }
    this.editingPrices.update((p) => ({ ...p, [row.id]: price }));
    this.operationInstancesApi.update(row.id, { price }).subscribe({
      next: () => {
        this.toastService.success('Price updated.');
        this.closePriceModal();
        this.loadItems();
      },
      error: () => this.toastService.error('Failed to save price.'),
    });
  }

  // ── Send to client ────────────────────────────────────────────

  sendVehicle(group: VehicleGroupRow): void {
    const vehicleInstanceId = group.vehicleInstanceId;
    this.sendingVehicle.set(vehicleInstanceId);

    const rows = group.operations;
    const total = rows.reduce((sum, r) => sum + this.getEstimatedCost(r), 0);
    const commPayload = {
      vehicleInstanceId,
      type: 'estimation',
      content: JSON.stringify({
        vehicleName: group.vehicleName,
        licensePlate: group.licensePlate,
        lineItems: rows.map((r) => ({ operation: r.operation, price: this.getEstimatedCost(r) })),
        total,
      }),
      sentAt: new Date().toISOString(),
      recipient: 'client',
      status: 'sent',
    };

    this.communicationsApi
      .create(commPayload as Record<string, unknown>)
      .pipe(
        concatMap(() =>
          this.instanceApi.update(vehicleInstanceId, { status: 'pending_approval' } as any),
        ),
      )
      .subscribe({
        next: () => {
          this.toastService.success(`Estimation sent to client for ${group.vehicleName}.`);
          this.sendingVehicle.set(null);
          this.closeDetail();
          this.loadItems();
        },
        error: () => {
          this.toastService.error('Failed to send estimation.');
          this.sendingVehicle.set(null);
        },
      });
  }

  isSending(vehicleInstanceId: string): boolean {
    return this.sendingVehicle() === vehicleInstanceId;
  }

  get selectedTotal(): number {
    return (this.selectedVehicle()?.operations ?? []).reduce(
      (sum, r) => sum + this.getEstimatedCost(r),
      0,
    );
  }
}
