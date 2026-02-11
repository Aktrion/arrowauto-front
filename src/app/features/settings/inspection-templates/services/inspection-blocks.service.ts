import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface InspectionBlock {
  _id: string;
  name: string;
  active: boolean;
  inspectionTemplateId: string;
  order: number;
  inspectionPointIds: string[];
}

export interface CreateInspectionBlockDto {
  name: string;
  active?: boolean;
  inspectionTemplateId: string;
  order: number;
  inspectionPointIds?: string[];
}

export interface UpdateInspectionBlockDto {
  name?: string;
  active?: boolean;
  order?: number;
  inspectionPointIds?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class InspectionBlocksService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inspection-blocks`;

  create(dto: CreateInspectionBlockDto) {
    return this.http.post<InspectionBlock>(this.apiUrl, dto);
  }

  update(id: string, dto: UpdateInspectionBlockDto) {
    return this.http.patch<InspectionBlock>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Helper to find blocks by template
  getBlocksByTemplateId(templateId: string) {
    return this.http.post<{ data: InspectionBlock[] }>(`${this.apiUrl}/search`, {
      filter: { inspectionTemplateId: templateId },
      sort: { order: 1 },
      limit: 100, // Assume reasonable limit
    });
  }
}
