import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { User } from '../../shared/models/user.model';
import { environment } from '../../../environments/environment';

interface BackendUser {
  _id?: string;
  id?: string;
  name: string;
  userName?: string;
  language?: string;
  country?: string;
  imageUrl?: string;
  avatar?: string;
  isActive?: boolean;
  enabled?: boolean;
  emails?: string[];
  role?: { _id?: string; id?: string; name: string };
  roleId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  private _users = signal<User[]>([]);
  readonly loaded = signal(false);
  readonly users = this._users.asReadonly();

  readonly operatorsByRole = computed(() =>
    this._users().filter((u) => {
      const roleName = u.role?.name?.toLowerCase();
      if (roleName) {
        return ['operator', 'technician', 'advisor'].includes(roleName);
      }
      return u.enabled !== false;
    }),
  );

  constructor() {
    this.loadUsers();
  }

  loadUsers() {
    return this.http
      .get<BackendUser[]>(this.apiUrl)
      .pipe(
        catchError(() => of([])),
      )
      .subscribe((users) => {
        this._users.set(users.map((user) => this.mapUser(user)));
        this.loaded.set(true);
      });
  }

  getOperators(): User[] {
    return this.operatorsByRole();
  }

  getUserById(id: string): User | undefined {
    return this._users().find((u) => u.id === id);
  }

  private mapUser(user: BackendUser): User {
    return {
      id: user._id || user.id,
      name: user.name,
      userName: user.userName,
      language: user.language,
      country: user.country as any,
      imageUrl: user.imageUrl || user.avatar,
      emails: user.emails,
      enabled: user.enabled ?? user.isActive ?? true,
      roleId: user.roleId || user.role?._id || user.role?.id,
      role: user.role
        ? {
            name: user.role.name,
            permissions: [],
          }
        : undefined,
    };
  }
}
