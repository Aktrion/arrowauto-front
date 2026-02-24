import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  InspectionPoint,
  BackendInspectionValue,
} from '@features/inspection/models/inspection.model';
import { InspectionPointsApiService } from '@features/inspection/services/api/inspection-points-api.service';
import { InspectionValuesApiService } from '@features/inspection/services/api/inspection-values-api.service';
import { InspectionTemplatesApiService } from '@features/inspection/services/api/inspection-templates-api.service';

@Injectable({
  providedIn: 'root',
})
export class InspectionService {
  private readonly pointsApi = inject(InspectionPointsApiService);
  private readonly valuesApi = inject(InspectionValuesApiService);
  private readonly templatesApi = inject(InspectionTemplatesApiService);

  fetchInspectionPoints(): Observable<InspectionPoint[]> {
    return this.pointsApi.getWithBlocks();
  }

  getInspectionValuesByProduct(vehicleInstanceId: string): Observable<BackendInspectionValue[]> {
    return this.valuesApi.searchByVehicleInstance(vehicleInstanceId);
  }

  getAllInspectionValues(): Observable<BackendInspectionValue[]> {
    return this.valuesApi.searchAll();
  }

  getInspectionValuesByIds(ids: string[]): Observable<BackendInspectionValue[]> {
    return this.valuesApi.searchByIds(ids);
  }

  createInspectionValue(payload: Record<string, unknown>) {
    return this.valuesApi.create(payload);
  }

  updateInspectionValue(id: string, payload: Record<string, unknown>) {
    return this.valuesApi.update(id, payload);
  }

  getInspectionPointsFromTemplate(templateId: string): Observable<InspectionPoint[]> {
    return this.templatesApi.getStructure(templateId);
  }

  mapValueToStatus(value?: 'red' | 'yellow' | 'ok'): 'ok' | 'warning' | 'defect' | 'not_inspected' {
    if (value === 'ok') return 'ok';
    if (value === 'yellow') return 'warning';
    if (value === 'red') return 'defect';
    return 'not_inspected';
  }

  mapStatusToValue(status?: string): 'red' | 'yellow' | 'ok' | undefined {
    if (status === 'ok') return 'ok';
    if (status === 'warning') return 'yellow';
    if (status === 'defect') return 'red';
    return undefined;
  }

  buildComments(comment?: string, partsCost?: number, laborCost?: number): string[] {
    const comments: string[] = [];
    if (comment?.trim()) comments.push(comment.trim());
    comments.push(`__partsCost:${Number(partsCost || 0)}`);
    comments.push(`__laborCost:${Number(laborCost || 0)}`);
    return comments;
  }

  readCostsFromComments(comments: string[]): { partsCost: number; laborCost: number } {
    const partsTag = comments.find((item) => item.startsWith('__partsCost:'));
    const laborTag = comments.find((item) => item.startsWith('__laborCost:'));
    return {
      partsCost: Number(partsTag?.split(':')[1] || 0),
      laborCost: Number(laborTag?.split(':')[1] || 0),
    };
  }

  normalizeId(ref?: unknown): string {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    const obj = ref as { _id?: string; id?: string };
    return obj._id || obj.id || '';
  }
}
