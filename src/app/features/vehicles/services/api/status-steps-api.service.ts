import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { BackendStatusStep } from '@shared/models/operation.model';

@Injectable({
  providedIn: 'root',
})
export class StatusStepsApiService extends BaseCrudService<
  BackendStatusStep,
  Partial<BackendStatusStep>,
  Partial<BackendStatusStep>
> {
  constructor() {
    super('/status-steps');
  }
}
