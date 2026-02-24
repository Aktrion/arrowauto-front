import { Injectable, inject, signal } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { tap } from 'rxjs';
import {
  InspectionTemplate,
  InspectionTemplateStructure,
  CreateInspectionTemplateDto,
  UpdateInspectionTemplateDto,
  UpsertInspectionTemplateStructureDto,
  InspectionTemplateSearchRequest,
  PaginatedInspectionTemplatesResponse,
} from '@features/settings/inspection-templates/models/inspection-template.model';

@Injectable({
  providedIn: 'root',
})
export class InspectionTemplatesService extends BaseCrudService<
  InspectionTemplate,
  CreateInspectionTemplateDto,
  UpdateInspectionTemplateDto
> {
  templates = signal<InspectionTemplate[]>([]);

  constructor() {
    super('/inspection-templates');
    this.getAll();
  }

  getAll() {
    return this.findAll()
      .pipe(tap((templates) => this.templates.set(templates)))
      .subscribe();
  }

  getOne(id: string) {
    return this.findOne(id);
  }

  getStructure(id: string) {
    return this.get<InspectionTemplateStructure>(`/${id}/structure`);
  }

  search(params: InspectionTemplateSearchRequest) {
    return this.findByPagination(params);
  }

  upsertStructure(dto: UpsertInspectionTemplateStructureDto) {
    return this.post<InspectionTemplateStructure>('/upsert-structure', dto).pipe(
      tap(() => this.getAll()),
    );
  }

  override create(dto: CreateInspectionTemplateDto) {
    return super.create(dto).pipe(tap(() => this.getAll()));
  }

  override update(id: string, dto: UpdateInspectionTemplateDto) {
    return super.update(id, dto).pipe(tap(() => this.getAll()));
  }

  deleteById(id: string) {
    return this.deleteOne(id).pipe(tap(() => this.getAll()));
  }
}
