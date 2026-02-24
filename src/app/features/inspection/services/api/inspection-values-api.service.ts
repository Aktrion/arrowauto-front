import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { InspectionValue } from '@features/inspection/models/inspection.model';
import { map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InspectionValuesApiService extends BaseCrudService<
  InspectionValue,
  Record<string, unknown>,
  Record<string, unknown>
> {
  constructor() {
    super('/inspection-values');
  }

  searchByVehicleInstance(vehicleInstanceId: string) {
    return this.findByPagination({
      page: 1,
      limit: 500,
      sortBy: 'createdAt',
      sortOrder: 'asc',
      filters: {
        vehicleInstanceId: { value: vehicleInstanceId, operator: 'equals' as const },
      },
    }).pipe(
      map((res) => res.data ?? []),
      catchError(() => of([])),
    );
  }

  searchAll() {
    return this.findByPagination({
      page: 1,
      limit: 5000,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      filters: {},
    }).pipe(
      map((res) => res.data ?? []),
      catchError(() => of([])),
    );
  }

  searchByIds(ids: string[]) {
    if (!ids.length) return of([]);
    return this.findByPagination({
      page: 1,
      limit: Math.max(100, ids.length),
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      filters: {
        _id: { value: ids, operator: 'in' as const },
      },
    }).pipe(
      map((res) => res.data ?? []),
      catchError(() => of([])),
    );
  }
}
