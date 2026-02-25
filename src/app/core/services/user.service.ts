import { Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { User } from '@shared/models/user.model';
import { UsersApiService } from '@core/services/api/users-api.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly usersApi = inject(UsersApiService);

  fetchUsers(): Observable<User[]> {
    return this.usersApi.findAll().pipe(
      catchError(() => of([])),
      map((users) => users.map((user) => this.mapUser(user))),
    );
  }

  getOperators(users: User[]): User[] {
    return users.filter((u) => {
      const roleName = u.role?.name?.toLowerCase();
      if (roleName) {
        return ['operator', 'technician', 'advisor'].includes(roleName);
      }
      return u.enabled !== false;
    });
  }

  getUserById(users: User[], id: string): User | undefined {
    return users.find((u) => u.id === id);
  }

  private mapUser(user: User): User {
    const role = user.role as User['role'] | undefined;
    const roleId = user.roleId || (role as any)?._id || (role as any)?.id;
    const roleName = (role as any)?.name;
    return {
      id: user._id || user.id,
      name: user.name,
      userName: user.userName,
      language: user.language,
      country: user.country as any,
      imageUrl: user.imageUrl || user.avatar,
      emails: user.emails,
      enabled: user.enabled ?? user.isActive ?? true,
      roleId,
      role: roleName
        ? {
            name: roleName,
            permissions: [],
          }
        : undefined,
    };
  }
}
