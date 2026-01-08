import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { Client } from '../../core/models';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './clients.component.html',
})
export class ClientsComponent {
  private dataService = inject(DataService);

  clients = this.dataService.clients;
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
    this.filteredClients.set(this.clients());
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
          c.company?.toLowerCase().includes(query)
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

    this.dataService.addClient({
      name: this.newClient.name,
      email: this.newClient.email,
      phone: this.newClient.phone,
      company: this.newClient.company || undefined,
      address: this.newClient.address || undefined,
      type: this.newClient.type,
    });

    this.filterClients();
    (document.getElementById('new_client_modal') as HTMLDialogElement)?.close();
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
