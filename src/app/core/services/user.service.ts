import { Injectable, signal, computed } from '@angular/core';
import { User } from '../../shared/models/user.model';
import { generateMockUsers } from '../../shared/utils/mock-data';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private _users = signal<User[]>(generateMockUsers());
  readonly users = this._users.asReadonly();

  readonly operatorsByRole = computed(() => this._users().filter((u) => u.role === 'operator'));

  getOperators(): User[] {
    return this.operatorsByRole();
  }

  getUserById(id: string): User | undefined {
    return this._users().find((u) => u.id === id);
  }
}
