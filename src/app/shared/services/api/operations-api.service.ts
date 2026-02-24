import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import {
  OperationMaster,
  BackendOperation,
} from '@shared/models/operation.model';
import { map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OperationsApiService extends BaseCrudService<
  OperationMaster,
  Omit<OperationMaster, 'id'>,
  Partial<OperationMaster>
> {
  constructor() {
    super('/operations');
  }

  fetchOperationMasters() {
    return this.findAll().pipe(
      catchError(() => of([])),
      map((ops) => ops.map((op: any) => this.mapOperationMaster(op))),
    );
  }

  private mapOperationMaster(op: BackendOperation | any): OperationMaster {
    return {
      id: op._id || op.id || '',
      shortName: op.shortName,
      description: op.description,
      defaultDuration: op.defaultDuration,
      defaultRatePerHour: op.defaultRatePerHour,
    };
  }
}
