import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'https://wr9wfpyr2j.eu-west-1.awsapprunner.com';
  private http = inject(HttpClient);

  constructor() {}

  login(userName: string, password: string) {
    return this.http.post<{ user: any; token: string }>(`${this.API_URL}/auth/login`, {
      userName,
      password,
    });
  }
}
