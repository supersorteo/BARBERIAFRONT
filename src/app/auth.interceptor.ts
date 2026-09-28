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
      // Solo manejar TENANT_INACTIVE para usuarios que tienen sesión activa.
      // Visitantes sin sesión (landing pública) dejan que el componente maneje el error.
      if (err.status === 403 && err.error?.code === 'TENANT_INACTIVE' && auth.isLoggedIn()) {
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
