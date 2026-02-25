import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';
import { Product } from '@features/vehicles/models/vehicle.model';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';

@Component({
  selector: 'app-inspection-list',
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <app-data-grid
      [config]="gridConfig"
      (stateChange)="handleGridStateChange($event)"
      (selectionChange)="handleSelectionChanged($event)"
      (edit)="handleEdit($event)"
    />
  `,
})
export class InspectionListComponent extends BaseListDirective<
  Product,
  Partial<Product>,
  Partial<Product>
> {
  private readonly router = inject(Router);

  constructor() {
    super(inject(VehicleInstancesApiService));
    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'ClipboardCheck',
      showNewButton: false,
      showEditButton: true,
      showDeleteButton: false,
      selectable: false,
      storageKey: 'inspection_queue_grid',
    };
    this.searchRequest.addFilter('statusId', { value: ['inspection', 'in_progress'], operator: 'in' });
  }

  protected getTitle(): string {
    return 'INSPECTION.TITLE';
  }

  protected getColumnDefinitions(): ColumnDef[] {
    return [
      {
        field: 'vehicle.make',
        headerName: 'VEHICLES.TABLE.VEHICLE',
        type: 'string',
        sortable: true,
        filterable: true,
        cellRenderer: ({ data }) => `${data?.vehicle?.make || ''} ${data?.vehicle?.model || ''}`.trim(),
      },
      {
        field: 'vehicle.licensePlate',
        headerName: 'VEHICLES.TABLE.LICENSE_PLATE',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'vehicle.jobNumber',
        headerName: 'VEHICLES.TABLE.JOB_NUMBER',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'status',
        headerName: 'VEHICLES.TABLE.STATUS',
        type: 'string',
        sortable: true,
        filterable: true,
        cellRenderer: ({ value }) => VehicleStatusUtils.formatStatus(value),
      },
      {
        field: 'updatedAt',
        headerName: 'COMMON.UPDATED_AT',
        type: 'date',
        sortable: true,
        filterable: false,
        cellRenderer: ({ data }) => {
          const dateValue = data?.updatedAt || data?.createdAt;
          return dateValue ? new Date(dateValue).toLocaleDateString('en-GB') : '-';
        },
      },
    ];
  }

  protected override onEdit(item: Product): void {
    if (!item?._id) return;
    this.router.navigate(['/inspection', item._id]);
  }
}
