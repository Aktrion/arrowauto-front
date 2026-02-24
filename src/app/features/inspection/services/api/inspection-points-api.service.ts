import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { InspectionPoint } from '@features/inspection/models/inspection.model';
import { map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InspectionPointsApiService extends BaseCrudService<
  InspectionPoint,
  Record<string, unknown>,
  Record<string, unknown>
> {
  constructor() {
    super('/inspection-points');
  }

  getWithBlocks() {
    return this.get<InspectionPoint[]>('/with-blocks').pipe(
      map((res) => {
        const data = (res as any)?.data ?? res;
        return Array.isArray(data) ? data : [];
      }),
      catchError(() => of([])),
    );
  }
}
