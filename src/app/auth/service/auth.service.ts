import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  message: string;
  user: { id: string; userName: string; name: string };
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private http = inject(HttpClient);

  constructor() {}

  login(userName: string, password: string) {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, {
      userName,
      password,
    });
  }

  logout() {
    return this.http.post<{ message: string }>(`${this.API_URL}/auth/logout`, {});
  }
}
