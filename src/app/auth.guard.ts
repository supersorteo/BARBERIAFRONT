import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  inject(Router).navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn() || !auth.isAdmin()) {
    const slug = auth.getUser()?.tenantId;
    inject(Router).navigate([slug ? `/${slug}/login` : '/login']);
    return false;
  }
  return auth.verificarSesion().pipe(
    map(ok => {
      if (ok) return true;
      // Si ya no está logueado, el interceptor manejó el TENANT_INACTIVE.
      // Si sigue logueado pero falló, redirigir al login.
      if (auth.isLoggedIn()) {
        const slug = auth.getUser()?.tenantId;
        inject(Router).navigate([slug ? `/${slug}/login` : '/login']);
      }
      return false;
    })
  );
};

export const barberoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) {
    const slug = auth.getUser()?.tenantId;
    inject(Router).navigate([slug ? `/${slug}/login` : '/login']);
    return false;
  }
  if (!auth.isBarbero()) {
    if (auth.isAdmin()) { inject(Router).navigate(['/admin']); return false; }
    const slug = auth.getUser()?.tenantId;
    inject(Router).navigate([slug ? `/${slug}/login` : '/login']);
    return false;
  }
  return auth.verificarSesion().pipe(
    map(ok => {
      if (ok) return true;
      if (auth.isLoggedIn()) {
        const slug = auth.getUser()?.tenantId;
        inject(Router).navigate([slug ? `/${slug}/login` : '/login']);
      }
      return false;
    })
  );
};

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn() && auth.isSuperAdmin()) return true;
  inject(Router).navigate(['/barberia-demo']);
  return false;
};

export const alreadyLoggedInGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) return true;
  const router = inject(Router);
  // SUPER_ADMIN solo se redirige si intenta entrar al /login global (sin slug).
  // En /:slug/login su sesión es transparente y no interfiere con la del tenant.
  if (auth.isSuperAdmin()) {
    if (!route.params['slug']) { router.navigate(['/superadmin']); return false; }
    return true;
  }
  if (auth.isAdmin())   { router.navigate(['/admin']);      return false; }
  if (auth.isBarbero()) { router.navigate(['/mi-agenda']); return false; }
  return true;
};
