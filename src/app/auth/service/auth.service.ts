import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);

  constructor() {}

  login(userName: string, password: string) {
    return this.http.post<{ user: any; token: string }>(`${this.API_URL}/auth/login`, {
      userName,
      password,
    });
  }
}
