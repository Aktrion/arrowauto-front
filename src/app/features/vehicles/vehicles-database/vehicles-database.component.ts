import { Component } from '@angular/core';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { VehiclesApiService } from '@features/vehicles/services/api/vehicles-api.service';
import { Vehicle } from '@features/vehicles/models/vehicle.model';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';

@Component({
  selector: 'app-vehicles-database',
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <app-data-grid
      [config]="gridConfig"
      (stateChange)="handleGridStateChange($event)"
      (selectionChange)="handleSelectionChanged($event)"
      (create)="handleCreate()"
      (edit)="handleEdit($event)"
      (delete)="handleDelete($event)"
    />
  `,
})
export class VehiclesDatabaseComponent extends BaseListDirective<
  Vehicle,
  Partial<Vehicle>,
  Partial<Vehicle>
> {
  constructor(private vehiclesApi: VehiclesApiService) {
    super(vehiclesApi);
    this.gridConfig = {
      ...this.gridConfig,
      showNewButton: false,
      showEditButton: false,
      showDeleteButton: false,
      selectable: false,
      storageKey: 'vehicles_database_grid',
    };
  }

  protected getTitle(): string {
    return 'VEHICLES.DATABASE_TITLE';
  }

  protected getColumnDefinitions(): ColumnDef[] {
    return [
      {
        field: 'make',
        headerName: 'VEHICLES.DATABASE.MAKE_MODEL',
        type: 'string',
        sortable: true,
        filterable: true,
        cellRenderer: ({ data }) => `${data.make || ''} ${data.model || ''}`.trim(),
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
        field: 'year',
        headerName: 'VEHICLES.DATABASE.YEAR',
        type: 'number',
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
    ];
  }
}
