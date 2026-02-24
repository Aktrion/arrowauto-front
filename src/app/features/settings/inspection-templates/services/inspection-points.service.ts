import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import {
  InspectionPoint,
  CreateInspectionPointDto,
  UpdateInspectionPointDto,
} from '@features/settings/inspection-templates/models/inspection-point.model';

@Injectable({
  providedIn: 'root',
})
export class InspectionPointsService extends BaseCrudService<
  InspectionPoint,
  CreateInspectionPointDto,
  UpdateInspectionPointDto
> {
  constructor() {
    super('/inspection-points');
  }

  getPointsByBlockId(blockId: string) {
    return this.findByPagination({
      page: 1,
      limit: 100,
      sortBy: 'order',
      sortOrder: 'asc',
      filters: {
        inspectionBlockId: { value: blockId, operator: 'equals' as const },
      },
    });
  }

  deleteById(id: string) {
    return this.deleteOne(id);
  }
}
