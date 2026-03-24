import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class InspectionUploadApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/upload`;

  uploadPhoto(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<{ url: string }>(this.base, form);
  }

  deletePhoto(url: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(this.base, { body: { url } });
  }
}
