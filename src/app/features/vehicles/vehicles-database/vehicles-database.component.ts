import { Component, inject, ViewChild } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { VehiclesApiService } from '@features/vehicles/services/api/vehicles-api.service';
import { Vehicle } from '@features/vehicles/models/vehicle.model';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';
import { ToastService } from '@core/services/toast.service';
import { VehicleEditModalComponent } from './vehicle-edit-modal/vehicle-edit-modal.component';
import { ICONS } from '@shared/icons';

@Component({
  selector: 'app-vehicles-database',
  standalone: true,
  imports: [DataGridComponent, LucideAngularModule, TranslateModule, VehicleEditModalComponent],
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
    super(inject(VehiclesApiService));
    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'Database',
      showNewButton: false,
      showEditButton: true,
      showDeleteButton: true,
      selectable: false,
      storageKey: 'vehicles_database_grid',
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
      {
        field: 'mileage',
        headerName: 'VEHICLES.DATABASE.MILEAGE',
        type: 'number',
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
