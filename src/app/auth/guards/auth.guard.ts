import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '@auth/store/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const isAuthenticated = authStore.isAuthenticated();

  if (!isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
