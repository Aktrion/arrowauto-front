import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth/service/auth.service';
import { User } from '@shared/models/user.model';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { computed } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { LoginResponse } from '@auth/models/auth.model';

export interface AuthStoreState {
  token: string | null;
  user: User | null;
}

const AUTH_STORAGE_KEY = 'auth';

const initialState: AuthStoreState = {
  token: null,
  user: null,
};

function persistAuthState(state: AuthStoreState, remember: boolean): void {
  const payload = JSON.stringify(state);
  if (remember) {
    localStorage.setItem(AUTH_STORAGE_KEY, payload);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, payload);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function clearPersistedAuthState(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => Boolean(store.token())),
  })),
  withMethods((store, authService = inject(AuthService), router = inject(Router)) => ({
    getSavedUserName(): string {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return '';

        const parsed = JSON.parse(raw) as Partial<AuthStoreState>;
        return parsed.user?.userName ?? '';
      } catch {
        return '';
      }
    },

    login(userName: string, password: string, remember = false): Observable<LoginResponse> {
      return authService.login(userName, password).pipe(
        tap((result) => {
          const nextState: AuthStoreState = {
            token: result.token,
            user: result.user as User,
          };
          patchState(store, nextState);
          persistAuthState(nextState, remember);
        }),
      );
    },

    logout(): Observable<{ message: string } | null> {
      return authService.logout().pipe(
        catchError(() => of(null)),
        tap(() => {
          patchState(store, initialState);
          clearPersistedAuthState();
          router.navigate(['/login']);
        }),
      );
    },

    updateUser(payload: Partial<User>): void {
      const currentUser = store.user();
      if (!currentUser) return;

      const nextState: AuthStoreState = {
        token: store.token(),
        user: {
          ...currentUser,
          ...payload,
        },
      };
      patchState(store, nextState);
      const wasRemembered = !!localStorage.getItem(AUTH_STORAGE_KEY);
      persistAuthState(nextState, wasRemembered);
    },
  })),
  withHooks({
    onInit(store) {
      try {
        const stored =
          localStorage.getItem(AUTH_STORAGE_KEY) ?? sessionStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return;

        const parsedStore = JSON.parse(stored) as Partial<AuthStoreState>;
        patchState(store, {
          token: parsedStore.token ?? null,
          user: parsedStore.user ?? null,
        });
      } catch {
        clearPersistedAuthState();
      }
    },
  }),
);
