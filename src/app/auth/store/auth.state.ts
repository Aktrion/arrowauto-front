import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable, inject } from '@angular/core';
import { Login, Logout, UpdateUser } from '@auth/store/auth.actions';
import { AuthService } from '@auth/service/auth.service';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';

import { User } from '@shared/models/user.model';

export interface AuthStateModel {
  token: string | null;
  user: User | null;
}

@State<AuthStateModel>({
  name: 'auth',
  defaults: {
    token: null,
    user: null,
  },
})
@Injectable()
export class AuthState {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Selector()
  static token(state: AuthStateModel): string | null {
    return state.token;
  }

  @Selector()
  static user(state: AuthStateModel): User | null {
    return state.user;
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return !!state.token;
  }

  @Action(Login)
  login(ctx: StateContext<AuthStateModel>, action: Login) {
    return this.authService.login(action.payload.userName, action.payload.password).pipe(
      tap((result: any) => {
        ctx.patchState({
          token: result.token,
          user: result.user,
        });
        // Navigate to dashboard after successful login
        // Assuming dashboard is the default protected route
        this.router.navigate(['/dashboard']);
      }),
    );
  }

  @Action(UpdateUser)
  updateUser(ctx: StateContext<AuthStateModel>, action: UpdateUser) {
    const state = ctx.getState();
    if (state.user) {
      ctx.patchState({
        user: {
          ...state.user,
          ...action.payload,
        },
      });
    }
  }

  @Action(Logout)
  logout(ctx: StateContext<AuthStateModel>) {
    return this.authService.logout().pipe(
      catchError(() => of(null)),
      tap(() => {
        ctx.setState({
          token: null,
          user: null,
        });
        this.router.navigate(['/login']);
      }),
    );
  }
}
