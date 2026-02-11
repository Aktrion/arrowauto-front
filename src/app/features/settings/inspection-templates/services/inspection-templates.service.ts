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
