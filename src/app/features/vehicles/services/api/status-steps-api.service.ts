import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { StatusStep } from '@shared/models/operation.model';

@Injectable({
  providedIn: 'root',
})
export class StatusStepsApiService extends BaseCrudService<
  StatusStep,
  Partial<StatusStep>,
  Partial<StatusStep>
> {
  constructor() {
    super('/status-steps');
  }
}
