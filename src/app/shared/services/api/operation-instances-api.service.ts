import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { Observable, catchError, map, of } from 'rxjs';
import { SearchRequestResponse } from '@core/models/request.model';
import { Operation, VehicleOperation } from '@shared/models/service.model';

interface WorkflowDataResponse {
  operations: Operation[];
  vehicleOperations: VehicleOperation[];
}

@Injectable({
  providedIn: 'root',
})
export class OperationInstancesApiService extends BaseCrudService<
  any,
  Record<string, unknown>,
  Record<string, unknown>
> {
  constructor() {
    super('/operation-instances');
  }

  getWorkflowData(): Observable<WorkflowDataResponse> {
    return this.get<WorkflowDataResponse>('/workflow-data').pipe(
      map((res) => {
        const data = (res as any)?.data ?? res;
        return {
          operations: (data.operations || []).map((op: any) => ({
            ...op,
            scheduledDate: op.scheduledDate ? new Date(op.scheduledDate) : undefined,
          })),
          vehicleOperations: (data.vehicleOperations || []).map((vo: any) => ({
            ...vo,
            scheduledDate: vo.scheduledDate ? new Date(vo.scheduledDate) : undefined,
          })),
        };
      }),
      catchError(() => of({ operations: [], vehicleOperations: [] })),
    );
  }

  searchInvoicing(params: any): Observable<SearchRequestResponse<any>> {
    return this.post<SearchRequestResponse<any>>('/invoicing/search', params);
  }

  searchEstimation(params: any): Observable<SearchRequestResponse<any>> {
    return this.post<SearchRequestResponse<any>>('/estimation/search', params);
  }
}
