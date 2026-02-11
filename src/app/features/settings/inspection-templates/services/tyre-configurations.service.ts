import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface TyreConfiguration {
  _id: string;
  code: string;
  // Add other fields if needed for display
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
    return this.http.get<TyreConfiguration[]>(this.apiUrl).subscribe((configs) => {
      this.configurations.set(configs);
    });
  }
}
