import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../core/services/base-crud.service';
import { Vehicle } from '../../models/vehicle.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class VehiclesApiService extends BaseCrudService<
  Vehicle,
  Partial<Vehicle>,
  Partial<Vehicle>
> {
  constructor() {
    super('/vehicles');
  }

  lookup(field: 'vin' | 'licensePlate', value: string): Observable<Vehicle | null> {
    const params = new HttpParams().set('field', field).set('value', value.trim());
    return this.get<Vehicle | null>('/lookup', { params }).pipe(
      map((res) => this.normalizeSingleResponse<Vehicle>(res)),
    );
  }

  // search/paginated is already covered by findByPagination in BaseCrudService
}
