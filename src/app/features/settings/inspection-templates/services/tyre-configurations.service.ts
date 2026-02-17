import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { tap } from 'rxjs';

export interface TyreConfiguration {
  _id: string;
  code: string;
  amberUpLimit: number;
  redUpLimit: number;
  chooseType?: string;
  winterAmberUpLimit?: number;
  winterRedUpLimit?: number;
}

export interface CreateTyreConfigurationDto {
  code: string;
  amberUpLimit: number;
  redUpLimit: number;
  chooseType?: string;
  winterAmberUpLimit?: number;
  winterRedUpLimit?: number;
}

export interface UpdateTyreConfigurationDto {
  code?: string;
  amberUpLimit?: number;
  redUpLimit?: number;
  chooseType?: string;
  winterAmberUpLimit?: number;
  winterRedUpLimit?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TyreConfigurationsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tyre-configurations`;

  configurations = signal<TyreConfiguration[]>([]);

  constructor() {
    this.getAll();
  }

  getAll() {
    return this.http
      .get<TyreConfiguration[]>(this.apiUrl)
      .pipe(tap((configs) => this.configurations.set(configs)))
      .subscribe();
  }

  create(dto: CreateTyreConfigurationDto) {
    return this.http.post<TyreConfiguration>(this.apiUrl, dto).pipe(tap(() => this.getAll()));
  }

  update(id: string, dto: UpdateTyreConfigurationDto) {
    return this.http
      .patch<TyreConfiguration>(`${this.apiUrl}/${id}`, dto)
      .pipe(tap(() => this.getAll()));
  }

  delete(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => this.getAll()));
  }
}
