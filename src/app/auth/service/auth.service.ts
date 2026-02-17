import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private http = inject(HttpClient);

  constructor() {}

  login(userName: string, password: string) {
    return this.http.post<{ user: any; token: string }>(`${this.API_URL}/auth/login`, {
      userName,
      password,
    });
  }
}
