import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  Client,
  BackendCustomer,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '@features/clients/models/client.model';
import { CustomersApiService } from '@features/clients/services/api/customers-api.service';

@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private readonly customersApi = inject(CustomersApiService);

  fetchClients(): Observable<Client[]> {
    return this.customersApi.fetchClients();
  }

  getClientById(clients: Client[], id: string): Client | undefined {
    return clients.find((c) => c.id === id);
  }

  searchClients(clients: Client[], query: string): Client[] {
    const lowerQuery = query.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.company?.toLowerCase().includes(lowerQuery),
    );
  }

  addClient(client: Omit<Client, 'id'>) {
    const [firstName, ...rest] = client.name.trim().split(' ').filter(Boolean);
    const dto: CreateCustomerDto = {
      firstName: firstName || client.name.trim(),
      lastName: rest.join(' ') || '-',
      mobilePhoneNumber: client.phone || undefined,
      emails: client.email ? [client.email] : undefined,
      title: client.company || undefined,
    };

    return this.customersApi.create(dto).pipe(
      map((created) => this.mapClient(created as unknown as BackendCustomer)),
    );
  }

  updateClient(id: string, client: Partial<Client>) {
    const nameSource = (client.name || '').trim();
    const nameParts = nameSource.split(' ').filter(Boolean);
    const [firstName, ...rest] = nameParts;

    const dto: UpdateCustomerDto = {};
    if (nameSource) {
      dto.firstName = firstName || nameSource;
      dto.lastName = rest.join(' ') || '-';
    }
    if (client.phone !== undefined) {
      dto.mobilePhoneNumber = client.phone || undefined;
    }
    if (client.email !== undefined) {
      dto.emails = client.email ? [client.email] : [];
    }
    if (client.company !== undefined) {
      dto.title = client.company || undefined;
    }

    return this.customersApi.update(id, dto).pipe(
      map((updated) => this.mapClient(updated as unknown as BackendCustomer)),
    );
  }

  private mapClient(customer: BackendCustomer): Client {
    const name = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim();
    return {
      id: customer._id || customer.id || '',
      name,
      email: customer.emails?.[0] ?? '',
      phone: customer.mobilePhoneNumber ?? '',
      company: customer.title,
      type: customer.title ? 'company' : 'individual',
    };
  }
}
