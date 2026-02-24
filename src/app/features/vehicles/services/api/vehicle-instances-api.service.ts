import { Injectable } from '@angular/core';
import { BaseCrudService } from '../../../../core/services/base-crud.service';
import { VehicleInstance, BackendProductActivityResponse } from '../../models/vehicle.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VehicleInstancesApiService extends BaseCrudService<
  VehicleInstance,
  Partial<VehicleInstance>,
  Partial<VehicleInstance>
> {
  constructor() {
    super('/vehicle-instances');
  }

  getActivity(id: string): Observable<BackendProductActivityResponse> {
    return this.get<BackendProductActivityResponse>(`/${id}/activity`);
  }
}
