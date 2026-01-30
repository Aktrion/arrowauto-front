import { User } from '../../core/models';

export class Login {
  static readonly type = '[Auth] Login';
  constructor(public payload: { userName: string; password: string }) {}
}

export class Logout {
  static readonly type = '[Auth] Logout';
}

export class UpdateUser {
  static readonly type = '[Auth] Update User';
  constructor(public payload: Partial<User>) {}
}
