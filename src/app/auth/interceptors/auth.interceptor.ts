import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '@auth/store/auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.token();

  const request = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      })
    : req.clone({ withCredentials: true });

  return next(request);
};
