import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import {
  Client,
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '@features/clients/models/client.model';
import { map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CustomersApiService extends BaseCrudService<
  Client,
  CreateCustomerDto,
  UpdateCustomerDto
> {
  constructor() {
    super('/customers');
  }

  fetchClients() {
    return this.findAll().pipe(
      catchError(() => of([])),
      map((customers) =>
        (customers as Customer[]).map((c) => this.mapClient(c)),
      ),
    );
  }

  private mapClient(customer: Customer): Client {
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
