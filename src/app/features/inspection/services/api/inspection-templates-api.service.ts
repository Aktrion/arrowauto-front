import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import {
  InspectionTemplateStructure,
  InspectionPoint,
} from '@features/inspection/models/inspection.model';
import { map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InspectionTemplatesApiService extends BaseCrudService<
  InspectionTemplateStructure,
  Record<string, unknown>,
  Record<string, unknown>
> {
  constructor() {
    super('/inspection-templates');
  }

  getStructure(templateId: string) {
    return this.get<InspectionTemplateStructure>(`/${templateId}/structure`).pipe(
      map((structure) => {
        const blocks = structure?.blocks || (structure as any)?.data?.blocks || [];
        const sortedBlocks = [...blocks].sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0),
        );
        const points: InspectionPoint[] = [];
        sortedBlocks.forEach((block: any) => {
          const blockPoints = block.points || [];
          blockPoints.forEach((point: any) => {
            points.push({
              id: point._id || point.id || '',
              name: point.name,
              category: block.name,
              type: point.type || 'standard',
              code: point.tyrePosition,
              predefinedComments: point.scriptedComments || [],
            });
          });
        });
        return points;
      }),
      catchError(() => of([])),
    );
  }
}
