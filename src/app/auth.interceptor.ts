import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AlertService } from './shared/alert.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const alert = inject(AlertService);
  const router = inject(Router);

  const token = auth.getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError(err => {
      if (!auth.isLoggedIn()) return throwError(() => err);

      if (err.status === 401) {
        // Token vencido o inválido — limpiar sesión y redirigir al login
        const slug = auth.getUser()?.tenantId;
        const isSuperAdmin = auth.isSuperAdmin();
        auth.logout();
        if (isSuperAdmin) {
          router.navigate(['/barberia-demo']);
        } else {
          router.navigate([slug ? `/${slug}/login` : '/login']);
        }
      } else if (err.status === 403 && err.error?.code === 'TENANT_INACTIVE') {
        const slug = auth.getUser()?.tenantId;
        auth.logout();
        alert.error(
          'Barbería desactivada',
          'Tu barbería fue desactivada. Contactá al administrador de la plataforma.'
        ).then(() => {
          router.navigate([slug ? `/${slug}/login` : '/login']);
        });
      }

      return throwError(() => err);
    })
  );
};
