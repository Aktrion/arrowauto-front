import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';
import { ClientService } from '@features/clients/services/client.service';
import { Product } from '@features/vehicles/models/vehicle.model';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';

@Component({
  selector: 'app-vehicles-instances',
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
export class VehiclesInstancesComponent
  extends BaseListDirective<Product, Partial<Product>, Partial<Product>>
  implements OnInit
{
  private instanceApi = inject(VehicleInstancesApiService);
  private clientService = inject(ClientService);
  private router = inject(Router);

  clients = signal<any[]>([]);
  constructor() {
    super(inject(VehicleInstancesApiService));
    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'Car',
      showNewButton: true,
      showEditButton: true,
      showDeleteButton: false,
      selectable: false,
      storageKey: 'vehicles_instances_grid',
    };
  }

  override ngOnInit() {
    this.clientService.fetchClients().subscribe((c) => this.clients.set(c));
    super.ngOnInit();
  }

  protected getTitle(): string {
    return 'VEHICLES.TITLE';
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
        field: 'customerId',
        headerName: 'VEHICLES.TABLE.CLIENT',
        type: 'string',
        sortable: false,
        filterable: true,
        cellRenderer: ({ data }) => this.getClientName(data?.customerId),
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
        headerName: 'VEHICLES.TABLE.CREATED',
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

  protected override onCreate(): void {
    this.router.navigate(['/vehicles-instances/new']);
  }

  protected override onEdit(item: Product): void {
    if (!item?._id) return;
    this.router.navigate(['/vehicles-instances', item._id]);
  }

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    return this.clientService.getClientById(this.clients(), clientId)?.name ?? 'Unknown';
  }
}
