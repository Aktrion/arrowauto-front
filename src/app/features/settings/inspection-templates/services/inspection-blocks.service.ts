import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import {
  InspectionBlock,
  CreateInspectionBlockDto,
  UpdateInspectionBlockDto,
} from '@features/settings/inspection-templates/models/inspection-block.model';

@Injectable({
  providedIn: 'root',
})
export class InspectionBlocksService extends BaseCrudService<
  InspectionBlock,
  CreateInspectionBlockDto,
  UpdateInspectionBlockDto
> {
  constructor() {
    super('/inspection-blocks');
  }

  getBlocksByTemplateId(templateId: string) {
    return this.findByPagination({
      page: 1,
      limit: 100,
      sortBy: 'order',
      sortOrder: 'asc',
      filters: {
        inspectionTemplateId: { value: templateId, operator: 'equals' as const },
      },
    });
  }
}
