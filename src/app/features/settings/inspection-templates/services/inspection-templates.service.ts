import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { tap } from 'rxjs';

export interface InspectionTemplate {
  _id: string;
  name: string;
  active: boolean;
  inspectionBlockIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InspectionTemplatePointStructure {
  _id: string;
  name: string;
  inspectionBlockId: string;
  order: number;
  type: 'standard' | 'tyre';
  tyreConfigurationId?: string;
  tyrePosition?: string;
  scriptedComments?: string[];
  mandatory: boolean;
  mandatoryMedia: 'required' | 'requiredIfNok' | 'optional';
  mandatoryComment: 'required' | 'requiredIfNok' | 'optional';
  active: boolean;
}

export interface InspectionTemplateBlockStructure {
  _id: string;
  name: string;
  active: boolean;
  inspectionTemplateId: string;
  order: number;
  inspectionPointIds: string[];
  points: InspectionTemplatePointStructure[];
}

export interface InspectionTemplateStructure {
  _id: string;
  name: string;
  active: boolean;
  inspectionBlockIds: string[];
  blocks: InspectionTemplateBlockStructure[];
}

export interface CreateInspectionTemplateDto {
  name: string;
  active?: boolean;
  inspectionBlockIds?: string[];
}

export interface UpdateInspectionTemplateDto {
  name?: string;
  active?: boolean;
  inspectionBlockIds?: string[];
}

export interface UpsertInspectionTemplateStructurePointDto {
  id?: string;
  name: string;
  type: 'standard' | 'tyre';
  tyreConfigurationId?: string;
  tyrePosition?: string;
  scriptedComments?: string[];
  mandatory?: boolean;
  mandatoryMedia?: 'required' | 'requiredIfNok' | 'optional';
  mandatoryComment?: 'required' | 'requiredIfNok' | 'optional';
  active?: boolean;
  order?: number;
}

export interface UpsertInspectionTemplateStructureBlockDto {
  id?: string;
  name: string;
  active?: boolean;
  order?: number;
  points: UpsertInspectionTemplateStructurePointDto[];
}

export interface UpsertInspectionTemplateStructureDto {
  templateId?: string;
  name: string;
  active?: boolean;
  blocks: UpsertInspectionTemplateStructureBlockDto[];
}

export interface InspectionTemplateSearchRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedInspectionTemplatesResponse {
  data: InspectionTemplate[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class InspectionTemplatesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inspection-templates`;

  templates = signal<InspectionTemplate[]>([]);

  constructor() {
    this.getAll();
  }

  getAll() {
    return this.http
      .get<InspectionTemplate[]>(this.apiUrl)
      .pipe(tap((templates) => this.templates.set(templates)))
      .subscribe();
  }

  getOne(id: string) {
    return this.http.get<InspectionTemplate>(`${this.apiUrl}/${id}`);
  }

  getStructure(id: string) {
    return this.http.get<InspectionTemplateStructure>(`${this.apiUrl}/${id}/structure`);
  }

  search(params: InspectionTemplateSearchRequest) {
    return this.http.post<PaginatedInspectionTemplatesResponse>(`${this.apiUrl}/search`, params);
  }

  upsertStructure(dto: UpsertInspectionTemplateStructureDto) {
    return this.http
      .post<InspectionTemplateStructure>(`${this.apiUrl}/upsert-structure`, dto)
      .pipe(tap(() => this.getAll()));
  }

  create(dto: CreateInspectionTemplateDto) {
    return this.http.post<InspectionTemplate>(this.apiUrl, dto).pipe(tap(() => this.getAll()));
  }

  update(id: string, dto: UpdateInspectionTemplateDto) {
    return this.http
      .patch<InspectionTemplate>(`${this.apiUrl}/${id}`, dto)
      .pipe(tap(() => this.getAll()));
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.getAll()));
  }
}
