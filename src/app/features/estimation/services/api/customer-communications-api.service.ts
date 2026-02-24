import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';

@Injectable({
  providedIn: 'root',
})
export class CustomerCommunicationsApiService extends BaseCrudService<
  unknown,
  Record<string, unknown>,
  Record<string, unknown>
> {
  constructor() {
    super('/customer-communications');
  }
}
