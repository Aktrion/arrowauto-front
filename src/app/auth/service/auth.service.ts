import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { LoginResponse } from '@auth/models/auth.model';

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
