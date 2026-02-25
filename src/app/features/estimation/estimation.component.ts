import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { CustomerCommunicationsApiService } from '@features/estimation/services/api/customer-communications-api.service';
import { ToastService } from '@core/services/toast.service';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { MongoEntity } from '@shared/models/mongo-entity.model';
import { OperationInstancesApiService } from '@shared/services/api/operation-instances-api.service';

interface EstimationRow extends MongoEntity {
  id: string;
  productId?: string;
  vehicleId?: string;
  vehicleName: string;
  licensePlate: string;
  operation: string;
  status: string;
  duration: number;
  price: number;
}

@Component({
  selector: 'app-estimation',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DataGridComponent, TranslateModule],
  templateUrl: './estimation.component.html',
})
export class EstimationComponent extends BaseListDirective<
  EstimationRow,
  Partial<EstimationRow>,
  Partial<EstimationRow>
> {
  private instanceApi = inject(VehicleInstancesApiService);
  private toastService = inject(ToastService);
  private communicationsApi = inject(CustomerCommunicationsApiService);
  private operationInstancesApi = inject(OperationInstancesApiService);
  icons = ICONS;

  sendingVehicle = signal<string | null>(null);
  editingPrices = signal<Record<string, number>>({});
  allRows = signal<EstimationRow[]>([]);

  grandTotal = computed(() =>
    this.allRows().reduce((sum, row) => sum + this.getEstimatedCost(row), 0),
  );

  constructor() {
    const operationInstancesApi = inject(OperationInstancesApiService);
    super(operationInstancesApi as any, (params) =>
      operationInstancesApi.searchEstimation(params),
    );

    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'DollarSign',
      showNewButton: false,
      showEditButton: false,
      showDeleteButton: false,
      selectable: false,
      storageKey: 'estimation_grid',
      customActions: [
        { icon: 'DollarSign', iconLabel: 'Set Price', action: (row) => this.setPrice(row) },
        { icon: 'Check', iconLabel: 'Save', action: (row) => this.saveRow(row) },
        { icon: 'Send', iconLabel: 'Send', action: (row) => this.sendVehicle(row) },
      ],
    };
  }

  protected getTitle(): string {
    return 'ESTIMATION.TITLE';
  }

  protected getColumnDefinitions(): ColumnDef[] {
    return [
      { field: 'vehicleName', headerName: 'Vehicle', type: 'string', sortable: true, filterable: true, dontTranslate: true },
      { field: 'licensePlate', headerName: 'Plate', type: 'string', sortable: true, filterable: true, dontTranslate: true },
      { field: 'operation', headerName: 'Operation', type: 'string', sortable: true, filterable: true, dontTranslate: true },
      { field: 'status', headerName: 'Status', type: 'string', sortable: true, filterable: true, dontTranslate: true },
      { field: 'duration', headerName: 'Duration', type: 'number', sortable: true, filterable: false, dontTranslate: true },
      {
        field: 'price',
        headerName: 'Price',
        type: 'number',
        sortable: true,
        filterable: false,
        dontTranslate: true,
        cellRenderer: ({ data }) => `£${this.getEstimatedCost(data).toFixed(2)}`,
      },
    ];
  }

  override handleGridStateChange(state: any): void {
    state.filters = state.filters || {};
    state.filters.status = { value: ['completed', 'in_progress'], operator: 'in' };
    super.handleGridStateChange(state);
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  protected override loadItems(): void {
    super.loadItems();
    this.operationInstancesApi
      .searchEstimation({
        page: 1,
        limit: 1000,
        filters: { status: { value: ['completed', 'in_progress'], operator: 'in' } },
      })
      .subscribe((res) => this.allRows.set((res?.data || []) as EstimationRow[]));
  }

  getEstimatedCost(row: EstimationRow): number {
    const saved = this.editingPrices()[row.id];
    if (saved !== undefined) return saved;
    return Number(row.price || 0);
  }

  setPrice(row: EstimationRow): void {
    const current = this.getEstimatedCost(row);
    const next = prompt('Set estimated price', String(current));
    if (next === null) return;
    const parsed = Number(next);
    if (Number.isNaN(parsed) || parsed < 0) {
      this.toastService.error('Invalid price.');
      return;
    }
    this.editingPrices.update((p) => ({ ...p, [row.id]: parsed }));
  }

  saveRow(row: EstimationRow): void {
    const price = this.getEstimatedCost(row);
    this.operationInstancesApi
      .update(row.id, { price, status: row.status })
      .subscribe({
        next: () => {
          this.toastService.success('Price updated.');
          this.loadItems();
        },
        error: () => this.toastService.error('Failed to save price.'),
      });
  }

  sendVehicle(row: EstimationRow): void {
    if (!row.vehicleId) return;
    this.sendingVehicle.set(row.vehicleId);

    this.operationInstancesApi
      .searchEstimation({
        page: 1,
        limit: 500,
        filters: {
          vehicleId: { value: row.vehicleId, operator: 'equals' },
          status: { value: ['completed', 'in_progress'], operator: 'in' },
        },
      })
      .subscribe({
        next: (response) => {
          const rows = (response?.data || []) as EstimationRow[];
          const total = rows.reduce((sum, item) => sum + this.getEstimatedCost(item), 0);
          this.instanceApi.findInstanceByVehicleId(row.vehicleId!).subscribe({
            next: (instance) => {
              const productId = instance?._id || row.productId;
              if (!productId) {
                this.toastService.error('Cannot find vehicle instance for this vehicle.');
                this.sendingVehicle.set(null);
                return;
              }
              const payload = {
                productId,
                type: 'estimation',
                content: JSON.stringify({
                  vehicleName: row.vehicleName,
                  licensePlate: row.licensePlate,
                  lineItems: rows.map((r) => ({ operation: r.operation, price: this.getEstimatedCost(r) })),
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
                      this.toastService.success(`Estimation sent to client for ${row.vehicleName}.`);
                      this.sendingVehicle.set(null);
                    },
                    error: () => {
                      this.toastService.success('Estimation sent. Status update pending.');
                      this.sendingVehicle.set(null);
                    },
                  });
                },
                error: () => {
                  this.toastService.error('Failed to send estimation.');
                  this.sendingVehicle.set(null);
                },
              });
            },
            error: () => {
              this.toastService.error('Cannot find vehicle instance for this vehicle.');
              this.sendingVehicle.set(null);
            },
          });
        },
        error: () => {
          this.toastService.error('Failed to load operations for vehicle.');
          this.sendingVehicle.set(null);
        },
      });
  }
}
