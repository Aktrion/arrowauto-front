import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, tap } from 'rxjs';
import { Client } from '../models/client.model';
import { environment } from '../../../../environments/environment';

interface BackendCustomer {
  _id?: string;
  id?: string;
  title?: string;
  firstName: string;
  lastName: string;
  mobilePhoneNumber?: string;
  emails?: string[];
}

interface CreateCustomerDto {
  title?: string;
  firstName: string;
  lastName: string;
  mobilePhoneNumber?: string;
  emails?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/customers`;

  private _clients = signal<Client[]>([]);
  readonly loaded = signal(false);
  readonly clients = this._clients.asReadonly();

  constructor() {
    this.loadClients();
  }

  loadClients() {
    return this.http
      .get<BackendCustomer[]>(this.apiUrl)
      .pipe(catchError(() => of([])))
      .subscribe((customers) => {
        this._clients.set(customers.map((customer) => this.mapClient(customer)));
        this.loaded.set(true);
      });
  }

  getClientById(id: string): Client | undefined {
    return this._clients().find((c) => c.id === id);
  }

  searchClients(query: string): Client[] {
    const lowerQuery = query.toLowerCase();
    return this._clients().filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) || c.company?.toLowerCase().includes(lowerQuery)
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

    return this.http.post<BackendCustomer>(this.apiUrl, dto).pipe(
      map((created) => this.mapClient(created)),
      tap((created) => this._clients.update((clients) => [created, ...clients])),
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
