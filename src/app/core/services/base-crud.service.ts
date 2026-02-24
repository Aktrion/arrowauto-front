import { Observable } from 'rxjs';
import { BaseApiService } from '@core/services/base-api.service';
import { HttpParams } from '@angular/common/http';
import { SearchRequest } from '@shared/utils/search-request.class';
import { SearchRequestResponse } from '@core/models/request.model';
import { map } from 'rxjs/operators';

export class BaseCrudService<T, CreateDTO, UpdateDTO> extends BaseApiService {
  constructor(controllerPrefix: string) {
    super(controllerPrefix);
  }

  findAll(params?: Record<string, any>): Observable<T[]> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.get<any>('', { params: httpParams }).pipe(
      map((response) => this.normalizeArrayResponse<T>(response)),
    );
  }

  findOne(id: string): Observable<T> {
    return this.get<any>(`/${id}`).pipe(
      map((response) => this.normalizeSingleResponse<T>(response) as T),
    );
  }

  create(createDto: CreateDTO): Observable<T> {
    return this.post<any>('', createDto).pipe(
      map((response) => this.normalizeSingleResponse<T>(response) as T),
    );
  }

  update(id: string, updateDto: UpdateDTO): Observable<T> {
    return this.patch<any>(`/${id}`, updateDto).pipe(
      map((response) => this.normalizeSingleResponse<T>(response) as T),
    );
  }

  deleteOne(id: string): Observable<void> {
    return this.delete<void>(`/${id}`);
  }

  deleteMany(ids: string[]): Observable<void> {
    return this.post<void>(`/deleteMany`, ids);
  }

  findByPagination(body: any): Observable<SearchRequestResponse<T>> {
    return this.post<SearchRequestResponse<T>>('/search', body);
  }
}
