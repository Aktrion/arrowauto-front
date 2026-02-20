import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OperationMaster {
  id: string;
  shortName: string;
  description?: string;
  defaultDuration: number;
  defaultRatePerHour: number;
}

interface BackendOperation {
  _id?: string;
  id?: string;
  shortName: string;
  description?: string;
  defaultDuration: number;
  defaultRatePerHour: number;
}

@Injectable({
  providedIn: 'root',
})
export class OperationApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/operations`;

  private _operations = signal<OperationMaster[]>([]);
  readonly operations = this._operations.asReadonly();
  readonly loaded = signal(false);

  constructor() {
    this.loadAll();
  }

  loadAll() {
    return this.http
      .get<BackendOperation[]>(this.apiUrl)
      .pipe(catchError(() => of([])))
      .subscribe((ops) => {
        this._operations.set(ops.map((op) => this.mapToFrontend(op)));
        this.loaded.set(true);
      });
  }

  getById(id: string): OperationMaster | undefined {
    return this._operations().find((o) => o.id === id);
  }

  create(payload: Omit<OperationMaster, 'id'>): Observable<OperationMaster> {
    return this.http.post<BackendOperation>(this.apiUrl, payload).pipe(
      tap((created) => {
        this._operations.update((ops) => [...ops, this.mapToFrontend(created)]);
      }),
      catchError((err) => {
        console.error('Error creating operation:', err);
        throw err;
      }),
    ) as Observable<any>;
  }

  update(id: string, payload: Partial<OperationMaster>): Observable<OperationMaster> {
    return this.http.patch<BackendOperation>(`${this.apiUrl}/${id}`, payload).pipe(
      tap((updated) => {
        this._operations.update((ops) =>
          ops.map((op) => (op.id === id ? this.mapToFrontend(updated) : op)),
        );
      }),
      catchError((err) => {
        console.error('Error updating operation:', err);
        throw err;
      }),
    ) as Observable<any>;
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._operations.update((ops) => ops.filter((op) => op.id !== id));
      }),
      catchError((err) => {
        console.error('Error deleting operation:', err);
        throw err;
      }),
    );
  }

  private mapToFrontend(op: BackendOperation): OperationMaster {
    return {
      id: op._id || op.id || '',
      shortName: op.shortName,
      description: op.description,
      defaultDuration: op.defaultDuration,
      defaultRatePerHour: op.defaultRatePerHour,
    };
  }
}
