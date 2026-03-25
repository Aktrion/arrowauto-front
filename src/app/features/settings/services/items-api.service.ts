import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';

@Injectable({ providedIn: 'root' })
export class ItemsApiService extends BaseCrudService<any, any, any> {
  constructor() {
    super('/references');
  }
}
