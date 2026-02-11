import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface InspectionPoint {
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

export interface CreateInspectionPointDto {
  name: string;
  inspectionBlockId: string;
  order: number;
  type: 'standard' | 'tyre';
  tyreConfigurationId?: string;
  tyrePosition?: string;
  scriptedComments?: string[];
  mandatory?: boolean;
  mandatoryMedia?: 'required' | 'requiredIfNok' | 'optional';
  mandatoryComment?: 'required' | 'requiredIfNok' | 'optional';
  active?: boolean;
}

export interface UpdateInspectionPointDto {
  name?: string;
  order?: number;
  // ... other fields as optional
  type?: 'standard' | 'tyre';
  tyreConfigurationId?: string;
  tyrePosition?: string;
  scriptedComments?: string[];
  mandatory?: boolean;
  mandatoryMedia?: 'required' | 'requiredIfNok' | 'optional';
  mandatoryComment?: 'required' | 'requiredIfNok' | 'optional';
  active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class InspectionPointsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inspection-points`;

  create(dto: CreateInspectionPointDto) {
    return this.http.post<InspectionPoint>(this.apiUrl, dto);
  }

  update(id: string, dto: UpdateInspectionPointDto) {
    return this.http.patch<InspectionPoint>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getPointsByBlockId(blockId: string) {
    return this.http.post<{ data: InspectionPoint[] }>(`${this.apiUrl}/search`, {
      filter: { inspectionBlockId: blockId },
      sort: { order: 1 },
      limit: 100,
    });
  }
}
