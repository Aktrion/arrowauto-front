import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientService } from './services/client.service';
import { Client } from '../../core/models';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '../../shared/icons';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './clients.component.html',
})
export class ClientsComponent {
  icons = ICONS;
  private clientService = inject(ClientService);
  private notificationService = inject(NotificationService);

  clients = this.clientService.clients;
  filteredClients = signal<Client[]>([]);

  searchQuery = '';
  typeFilter = '';

  newClient = {
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    type: 'individual' as 'individual' | 'company',
  };

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

  filterClients(): void {
    let filtered = this.clients();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.company?.toLowerCase().includes(query),
      );
    }

    if (this.typeFilter) {
      filtered = filtered.filter((c) => c.type === this.typeFilter);
    }

    this.filteredClients.set(filtered);
  }

  getCompanyCount(): number {
    return this.clients().filter((c) => c.type === 'company').length;
  }

  getIndividualCount(): number {
    return this.clients().filter((c) => c.type === 'individual').length;
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
