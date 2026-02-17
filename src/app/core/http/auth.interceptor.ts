import { HttpInterceptorFn } from '@angular/common/http';

const AUTH_STORAGE_KEY = 'auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token: string | null = null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      token = parsed?.token ?? null;
    }
  } catch {
    token = null;
  }

  const request = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      })
    : req.clone({ withCredentials: true });

  return next(request);
};
