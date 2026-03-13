import { Component, inject, ViewChild } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { VehiclesApiService } from '@features/vehicles/services/api/vehicles-api.service';
import { Vehicle } from '@features/vehicles/models/vehicle.model';
import { map, Observable } from 'rxjs';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';
import { licensePlateBadge } from '@shared/utils/license-plate.utils';
import { ToastService } from '@core/services/toast.service';
import { VehicleEditModalComponent } from './vehicle-edit-modal/vehicle-edit-modal.component';
import { ICONS } from '@shared/icons';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vehicles-database',
  standalone: true,
  imports: [
    CommonModule,
    DataGridComponent,
    LucideAngularModule,
    TranslateModule,
    VehicleEditModalComponent,
  ],
  templateUrl: './vehicles-database.component.html',
})
export class VehiclesDatabaseComponent extends BaseListDirective<
  Vehicle,
  Partial<Vehicle>,
  Partial<Vehicle>
> {
  icons = ICONS;
  private vehiclesApi = inject(VehiclesApiService);
  private toastService = inject(ToastService);

  @ViewChild('editModal') editModal!: VehicleEditModalComponent;

  constructor() {
    const vehiclesApiService = inject(VehiclesApiService);
    super(vehiclesApiService, (params) =>
      vehiclesApiService.findByPagination(params).pipe(
        map((res: any) => ({
          ...res,
          data: res.data.map((v: Vehicle) => ({
            ...v,
            vehicle_instances: v.vehicle_instances?.length
              ? v.vehicle_instances
              : [
                  {
                    id: 'mock-1',
                    code: 'INST-001',
                    jobNumber: 'J-2024-001',
                    customerName: 'Enterprise Holdings',
                    status: 'pending_inspection',
                    mileage: 12500,
                    distanceUnit: 'km',
                    checkInDate: new Date(2024, 2, 10, 9, 30).toISOString(),
                    checkOutDate: null,
                    createdAt: new Date(2024, 2, 10, 9, 30).toISOString(),
                  },
                  {
                    id: 'mock-2',
                    code: 'INST-002',
                    jobNumber: 'J-2023-854',
                    customerName: 'Hertz Rent-a-Car',
                    status: 'completed',
                    mileage: 48000,
                    distanceUnit: 'km',
                    checkInDate: new Date(2023, 11, 5, 10, 15).toISOString(),
                    checkOutDate: new Date(2023, 11, 8, 16, 45).toISOString(),
                    createdAt: new Date(2023, 11, 5, 10, 15).toISOString(),
                  },
                ],
          })),
        })),
      ),
    );
    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'Database',
      showNewButton: false,
      showEditButton: true,
      showDeleteButton: true,
      selectable: false,
      storageKey: 'vehicles_database_grid',
      expandable: true,
    };
  }

  protected getTitle(): string {
    return 'VEHICLES.DATABASE_TITLE';
  }

  protected getColumnDefinitions(): ColumnDef[] {
    const model = (d: Vehicle) => d.model ?? (d as any).vehicleModel ?? '';
    return [
      {
        field: 'make',
        headerName: 'VEHICLES.DATABASE.MAKE_MODEL',
        type: 'string',
        sortable: true,
        filterable: true,
        cellRenderer: ({ data }) => `${data.make || ''} ${model(data)}`.trim(),
      },
      {
        field: 'licensePlate',
        headerName: 'VEHICLES.DATABASE.LICENSE_PLATE',
        type: 'string',
        sortable: true,
        filterable: true,
        cellRenderer: ({ value }) => licensePlateBadge(value),
      },
      {
        field: 'vin',
        headerName: 'VEHICLES.DATABASE.VIN',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'colour',
        headerName: 'VEHICLES.DATABASE.COLOR',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'engine',
        headerName: 'VEHICLES.DATABASE.ENGINE',
        type: 'string',
        sortable: true,
        filterable: true,
      },
    ];
  }

  protected override onEdit(item: Vehicle): void {
    this.editModal?.open(item);
  }

  protected override onDelete(item: Vehicle): void {
    const id = (item as any)._id || (item as any).id;
    if (!id) return;
    const model = item.model ?? (item as any).vehicleModel;
    const confirmed = window.confirm(
      this.getDeleteConfirmMessage(item.make, model, item.licensePlate),
    );
    if (!confirmed) return;
    this.vehiclesApi.deleteOne(id).subscribe({
      next: () => {
        this.toastService.success('VEHICLES.TOAST.DELETED');
        this.loadItems();
      },
      error: () => this.toastService.error('VEHICLES.TOAST.DELETE_FAILED'),
    });
  }

  private getDeleteConfirmMessage(make?: string, model?: string, plate?: string): string {
    const desc = [make, model].filter(Boolean).join(' ') || plate || 'this vehicle';
    return `Delete ${desc}? This cannot be undone.`;
  }
}
