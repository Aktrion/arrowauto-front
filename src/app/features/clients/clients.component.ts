import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { ToastService } from '@core/services/toast.service';
import { Client } from '@features/clients/models/client.model';
import { CustomersApiService } from '@features/clients/services/api/customers-api.service';
import { ClientService } from '@features/clients/services/client.service';
import { CreateCustomerDto, UpdateCustomerDto } from '@features/clients/models/client.model';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';
import { ICONS } from '@shared/icons';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslateModule, DataGridComponent],
  templateUrl: './clients.component.html',
})
export class ClientsComponent extends BaseListDirective<Client, CreateCustomerDto, UpdateCustomerDto> {
  icons = ICONS;
  private clientService = inject(ClientService);
  private notificationService = inject(ToastService);
  private translate = inject(TranslateService);

  newClient = {
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    type: 'individual' as 'individual' | 'company',
  };

  editClient = {
    id: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    type: 'individual' as 'individual' | 'company',
  };

  constructor(private customersApi: CustomersApiService) {
    super(customersApi);
    this.gridConfig = {
      ...this.gridConfig,
      titleIcon: 'Users',
      showNewButton: true,
      showEditButton: true,
      showDeleteButton: true,
      selectable: false,
      storageKey: 'clients_grid',
    };
  }

  protected getTitle(): string {
    return 'CLIENTS.TITLE';
  }

  protected getColumnDefinitions(): ColumnDef[] {
    return [
      {
        field: 'name',
        headerName: 'CLIENTS.MODAL.FULL_NAME',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'company',
        headerName: 'CLIENTS.MODAL.COMPANY_NAME',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'email',
        headerName: 'CLIENTS.MODAL.EMAIL',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'phone',
        headerName: 'CLIENTS.MODAL.PHONE',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        field: 'type',
        headerName: 'CLIENTS.MODAL.TYPE',
        type: 'string',
        sortable: true,
        filterable: true,
      },
    ];
  }

  protected override onCreate(): void {
    this.openNewClientModal();
  }

  protected override onEdit(item: Client): void {
    this.openEditClientModal(item);
  }

  protected override onDelete(item: Client): void {
    if (!item.id) return;
    this.customersApi.deleteOne(item.id).subscribe({
      next: () => {
        this.notificationService.success(this.translate.instant('CLIENTS.TOAST.DELETED'));
        this.loadItems();
      },
      error: () => this.notificationService.error(this.translate.instant('CLIENTS.TOAST.DELETE_FAILED')),
    });
  }

  openNewClientModal(): void {
    this.resetNewClient();
    (document.getElementById('new_client_modal') as HTMLDialogElement)?.showModal();
  }

  createClient(): void {
    if (!this.newClient.name || !this.newClient.email || !this.newClient.phone) return;

    this.clientService
      .addClient({
        name: this.newClient.name,
        email: this.newClient.email,
        phone: this.newClient.phone,
        company: this.newClient.company || undefined,
        address: this.newClient.address || undefined,
        type: this.newClient.type,
      })
      .subscribe({
        next: () => {
          this.loadItems();
          (document.getElementById('new_client_modal') as HTMLDialogElement)?.close();
          this.notificationService.success(this.translate.instant('CLIENTS.TOAST.CREATED'));
        },
        error: () => this.notificationService.error(this.translate.instant('CLIENTS.TOAST.CREATE_FAILED')),
      });
  }

  openEditClientModal(client: Client): void {
    this.editClient = {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company || '',
      address: client.address || '',
      type: client.type,
    };
    (document.getElementById('edit_client_modal') as HTMLDialogElement)?.showModal();
  }

  saveEditClient(): void {
    if (!this.editClient.id || !this.editClient.name) {
      return;
    }

    this.clientService
      .updateClient(this.editClient.id, {
        name: this.editClient.name,
        email: this.editClient.email,
        phone: this.editClient.phone,
        company: this.editClient.type === 'company' ? this.editClient.company : undefined,
        type: this.editClient.type,
      })
      .subscribe({
        next: () => {
          this.loadItems();
          (document.getElementById('edit_client_modal') as HTMLDialogElement)?.close();
          this.notificationService.success(this.translate.instant('CLIENTS.TOAST.UPDATED'));
        },
        error: () => this.notificationService.error(this.translate.instant('CLIENTS.TOAST.UPDATE_FAILED')),
      });
  }

  resetNewClient(): void {
    this.newClient = {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      type: 'individual',
    };
  }
}
