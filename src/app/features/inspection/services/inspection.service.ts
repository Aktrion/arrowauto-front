import { Injectable, signal } from '@angular/core';
import { Inspection, InspectionPoint } from '../models/inspection.model';
import { generateMockInspectionPoints } from '../../../shared/utils/mock-data';

@Injectable({
  providedIn: 'root',
})
export class InspectionService {
  private _inspectionPoints = signal<InspectionPoint[]>(generateMockInspectionPoints());
  private _inspections = signal<Inspection[]>([]);

  readonly inspectionPoints = this._inspectionPoints.asReadonly();
  readonly inspections = this._inspections.asReadonly();

  getInspectionPoints(): InspectionPoint[] {
    return this._inspectionPoints();
  }

  // Add more inspection methods as needed
}
