import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Inspection, InspectionPoint } from '../models/inspection.model';

interface BackendInspectionPoint {
  _id?: string;
  id?: string;
  name: string;
  inspectionBlockId?: string;
  scriptedComments?: string[];
  tyrePosition?: string;
  type?: 'standard' | 'tyre';
}

interface BackendInspectionBlock {
  _id?: string;
  id?: string;
  name: string;
  order?: number;
}

export interface BackendInspectionValue {
  _id?: string;
  id?: string;
  vehicleInstanceId?: string;
  // Legacy compatibility field
  productId?: string;
  inspectionPointId?: string;
  inspectionPoint?: { _id?: string; id?: string };
  type: 'standard' | 'tyre';
  value?: 'red' | 'yellow' | 'ok';
  comments?: string[];
  mediaUrls?: string[];
  innerDepth?: number;
  midDepth?: number;
  outerDepth?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendTemplatePoint {
  _id?: string;
  id?: string;
  name: string;
  type?: 'standard' | 'tyre';
  scriptedComments?: string[];
  tyrePosition?: string;
}

interface BackendTemplateBlock {
  _id?: string;
  id?: string;
  name: string;
  order?: number;
  points?: BackendTemplatePoint[];
}

interface BackendInspectionTemplateStructure {
  _id?: string;
  id?: string;
  name: string;
  blocks: BackendTemplateBlock[];
}

@Injectable({
  providedIn: 'root',
})
export class InspectionService {
  private readonly http = inject(HttpClient);
  private readonly pointsApiUrl = `${environment.apiUrl}/inspection-points`;
  private readonly blocksApiUrl = `${environment.apiUrl}/inspection-blocks`;
  private readonly valuesApiUrl = `${environment.apiUrl}/inspection-values`;
  private readonly templatesApiUrl = `${environment.apiUrl}/inspection-templates`;

  private _inspectionPoints = signal<InspectionPoint[]>([]);
  private _inspections = signal<Inspection[]>([]);
  readonly loaded = signal(false);

  readonly inspectionPoints = this._inspectionPoints.asReadonly();
  readonly inspections = this._inspections.asReadonly();

  constructor() {
    this.loadInspectionPoints();
  }

  loadInspectionPoints() {
    return forkJoin({
      blocks: this.http.get<BackendInspectionBlock[]>(this.blocksApiUrl).pipe(catchError(() => of([]))),
      points: this.http.get<BackendInspectionPoint[]>(this.pointsApiUrl).pipe(catchError(() => of([]))),
    }).subscribe(({ blocks, points }) => {
      const blockMap = new Map(blocks.map((block) => [block._id || block.id || '', block.name]));
      this._inspectionPoints.set(
        points.map((point) => ({
          id: point._id || point.id || '',
          code: point.tyrePosition || undefined,
          category: blockMap.get(point.inspectionBlockId || '') || 'General',
          name: point.name,
          type: point.type || 'standard',
          predefinedComments: point.scriptedComments || [],
        })),
      );
      this.loaded.set(true);
    });
  }

  getInspectionValuesByProduct(vehicleInstanceId: string) {
    return this.http
      .post<{ data?: BackendInspectionValue[] } | BackendInspectionValue[]>(
        `${this.valuesApiUrl}/search`,
        {
        page: 1,
        limit: 500,
        sortBy: 'createdAt',
        sortOrder: 'asc',
        filters: {
          vehicleInstanceId: {
            value: vehicleInstanceId,
            operator: 'equals',
          },
        },
      },
      )
      .pipe(
        map((res) => (Array.isArray(res) ? res : res.data || [])),
        catchError(() => of([])),
      );
  }

  getAllInspectionValues() {
    return this.http
      .post<{ data?: BackendInspectionValue[] } | BackendInspectionValue[]>(
        `${this.valuesApiUrl}/search`,
        {
          page: 1,
          limit: 5000,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          filters: {},
        },
      )
      .pipe(
        map((res) => (Array.isArray(res) ? res : res.data || [])),
        catchError(() => of([])),
      );
  }

  getInspectionValuesByIds(ids: string[]) {
    if (!ids.length) {
      return of([] as BackendInspectionValue[]);
    }

    return this.http
      .post<{ data?: BackendInspectionValue[] } | BackendInspectionValue[]>(
        `${this.valuesApiUrl}/search`,
        {
          page: 1,
          limit: Math.max(100, ids.length),
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          filters: {
            _id: {
              value: ids,
              operator: 'in',
            },
          },
        },
      )
      .pipe(
        map((res) => (Array.isArray(res) ? res : res.data || [])),
        catchError(() => of([])),
      );
  }

  createInspectionValue(payload: Record<string, any>) {
    return this.http.post<BackendInspectionValue>(this.valuesApiUrl, payload);
  }

  updateInspectionValue(id: string, payload: Record<string, any>) {
    return this.http.patch<BackendInspectionValue>(`${this.valuesApiUrl}/${id}`, payload);
  }

  getInspectionPointsFromTemplate(templateId: string) {
    return this.http
      .get<BackendInspectionTemplateStructure>(`${this.templatesApiUrl}/${templateId}/structure`)
      .pipe(
        map((structure) => {
          const sortedBlocks = [...(structure.blocks || [])].sort(
            (a, b) => (a.order || 0) - (b.order || 0),
          );
          const points: InspectionPoint[] = [];
          sortedBlocks.forEach((block) => {
            const blockPoints = [...(block.points || [])];
            blockPoints.forEach((point) => {
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

  getInspectionPoints(): InspectionPoint[] {
    return this._inspectionPoints();
  }
}
