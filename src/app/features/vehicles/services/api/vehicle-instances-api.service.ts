import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { BaseCrudService } from '@core/services/base-crud.service';
import {
  VehicleInstance,
  VehicleInstanceActivityResponse,
  ProductActivityEvent,
  VehicleInstanceActivityEventType,
} from '@features/vehicles/models/vehicle.model';

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

  getActivity(id: string): Observable<VehicleInstanceActivityResponse> {
    return this.get<VehicleInstanceActivityResponse>(`/${id}/activity`);
  }

  findInstanceByVehicleId(vehicleId: string): Observable<VehicleInstance | null> {
    return this.findByPagination({
      page: 1,
      limit: 1,
      filters: { vehicleId: { value: vehicleId, operator: 'equals' as const } },
    }).pipe(
      map((res) => (res.data?.length ? res.data[0] : null)),
      catchError(() => of(null)),
    );
  }

  getActivityTimeline(id: string): Observable<ProductActivityEvent[]> {
    return this.getActivity(id).pipe(
      map((res) =>
        (res.data || []).map((e): ProductActivityEvent => ({
          type: (e.type as VehicleInstanceActivityEventType) ?? 'product_created',
          occurredAt: e.occurredAt ? new Date(e.occurredAt) : new Date(),
          actorName: e.actorName,
          message: e.message ?? '',
          metadata: e.metadata,
        })),
      ),
      catchError(() => of([])),
    );
  }
}
