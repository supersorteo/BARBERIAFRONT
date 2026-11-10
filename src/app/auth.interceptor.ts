import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AlertService } from './shared/alert.service';
import { environment } from '../environments/environment';

const apiOrigin = new URL(environment.apiBase, window.location.origin).origin;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const alert = inject(AlertService);
  const router = inject(Router);

  const token = auth.getToken();
  const esApiPropia = !/^[a-z][a-z0-9+.-]*:/i.test(req.url) || req.url.startsWith(apiOrigin);
  if (token && esApiPropia) {
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
      } else if (err.status === 403 && err.error?.code === 'SUBSCRIPTION_EXPIRED') {
        const slug = auth.getUser()?.tenantId;
        auth.logout();
        alert.error(
          'Suscripción vencida',
          'La suscripción de tu barbería venció. Renová tu plan para seguir usando el panel.'
        ).then(() => {
          router.navigate(['/pago/renovar'], { queryParams: slug ? { slug } : {} });
        });
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
