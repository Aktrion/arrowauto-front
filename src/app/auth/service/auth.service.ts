import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);

  constructor() {}

  login(email: string, password: string) {
    return this.http.post(`${this.API_URL}/login`, { email, password });
  }
}
