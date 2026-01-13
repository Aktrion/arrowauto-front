import { Injectable, signal } from '@angular/core';
import { Client } from '../models/client.model';
import { generateMockClients } from '../../../shared/utils/mock-data';
import { generateId } from '../../../shared/utils/id-generator';

@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private _clients = signal<Client[]>(generateMockClients());
  readonly clients = this._clients.asReadonly();

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

  addClient(client: Omit<Client, 'id'>): Client {
    const newClient: Client = {
      ...client,
      id: generateId(),
    };
    this._clients.update((clients) => [...clients, newClient]);
    return newClient;
  }
}
