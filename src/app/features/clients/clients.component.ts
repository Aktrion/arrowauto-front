import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientService } from './services/client.service';
import { Client } from '../../core/models';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '../../shared/icons';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './clients.component.html',
})
export class ClientsComponent {
  icons = ICONS;
  private clientService = inject(ClientService);
  private notificationService = inject(ToastService);

  clients = this.clientService.clients;
  filteredClients = signal<Client[]>([]);
  isTableView = signal(true);
  currentPage = signal(1);
  readonly pageSize = 10;

  searchQuery = '';
  searchField: 'all' | 'name' | 'email' | 'company' | 'phone' = 'all';
  typeFilter = '';

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

  paginatedClients = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredClients().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredClients().length / this.pageSize)),
  );

  constructor() {
    effect(() => {
      this.filteredClients.set(this.clients());
      if (this.searchQuery || this.typeFilter) {
        this.filterClients();
      }
    });
  }

  setTypeFilter(type: string): void {
    this.typeFilter = type;
    this.filterClients();
  }

  toggleView(isTable: boolean): void {
    this.isTableView.set(isTable);
  }

  filterClients(): void {
    let filtered = this.clients();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        const name = c.name.toLowerCase();
        const email = c.email.toLowerCase();
        const company = c.company?.toLowerCase() || '';
        const phone = c.phone?.toLowerCase() || '';

        if (this.searchField === 'name') return name.includes(query);
        if (this.searchField === 'email') return email.includes(query);
        if (this.searchField === 'company') return company.includes(query);
        if (this.searchField === 'phone') return phone.includes(query);

        return (
          name.includes(query) ||
          email.includes(query) ||
          company.includes(query) ||
          phone.includes(query)
        );
      });
    }

    if (this.typeFilter) {
      filtered = filtered.filter((c) => c.type === this.typeFilter);
    }

    this.filteredClients.set(filtered);
    this.currentPage.set(1);
  }

  setSearchField(field: 'all' | 'name' | 'email' | 'company' | 'phone'): void {
    this.searchField = field;
    this.filterClients();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          this.filterClients();
          (document.getElementById('new_client_modal') as HTMLDialogElement)?.close();
          this.notificationService.success('Client created successfully.');
        },
        error: () => this.notificationService.error('Failed to create client.'),
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
          this.filterClients();
          (document.getElementById('edit_client_modal') as HTMLDialogElement)?.close();
          this.notificationService.success('Client updated successfully.');
        },
        error: () => this.notificationService.error('Failed to update client.'),
      });
  }

  nextPage() {
    if (this.currentPage() >= this.totalPages()) return;
    this.currentPage.update((p) => p + 1);
  }

  prevPage() {
    if (this.currentPage() <= 1) return;
    this.currentPage.update((p) => p - 1);
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
