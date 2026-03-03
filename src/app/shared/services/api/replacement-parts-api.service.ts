import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { Observable } from 'rxjs';

export interface ReplacementPart {
  _id?: string;
  operationInstanceId: string;
  qty: number;
  partNumber?: string;
  partDescription?: string;
  partCategory?: string;
  price?: number;
  vat?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReplacementPartsApiService extends BaseCrudService<
  ReplacementPart,
  Partial<ReplacementPart>,
  Partial<ReplacementPart>
> {
  constructor() {
    super('/replacement-parts');
  }

  findByOperationInstance(operationInstanceId: string): Observable<ReplacementPart[]> {
    return this.get<ReplacementPart[]>(
      `?operationInstanceId=${encodeURIComponent(operationInstanceId)}`,
    );
  }
}
