import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const user   = auth.getUser();
  const routeSlug = route.params['slug'];
  if (!auth.isLoggedIn() || !auth.isAdmin()) {
    router.navigate([user?.tenantId ? `/${user.tenantId}/login` : '/login']);
    return false;
  }
  if (routeSlug && user?.tenantId !== routeSlug) {
    router.navigate([`/${user!.tenantId}/admin`]);
    return false;
  }
  return auth.verificarSesion().pipe(
    map(ok => {
      if (ok) return true;
      const slug = auth.getUser()?.tenantId;
      auth.logout();
      router.navigate([slug ? `/${slug}/login` : '/login']);
      return false;
    })
  );
};

export const barberoGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const user   = auth.getUser();
  const routeSlug = route.params['slug'];
  if (!auth.isLoggedIn()) {
    router.navigate([user?.tenantId ? `/${user.tenantId}/login` : '/login']);
    return false;
  }
  if (!auth.isBarbero()) {
    if (auth.isAdmin()) {
      router.navigate(user?.tenantId ? ['/', user.tenantId, 'admin'] : ['/admin']);
      return false;
    }
    router.navigate([user?.tenantId ? `/${user.tenantId}/login` : '/login']);
    return false;
  }
  if (routeSlug && user?.tenantId !== routeSlug) {
    router.navigate([`/${user!.tenantId}/mi-agenda`]);
    return false;
  }
  return auth.verificarSesion().pipe(
    map(ok => {
      if (ok) return true;
      const slug = auth.getUser()?.tenantId;
      auth.logout();
      router.navigate([slug ? `/${slug}/login` : '/login']);
      return false;
    })
  );
};

export const superAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.isSuperAdmin()) return true;
  router.navigate(['/']);
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
  if (auth.isAdmin()) {
    const slug = auth.getUser()?.tenantId;
    router.navigate(slug ? ['/', slug, 'admin'] : ['/admin']);
    return false;
  }
  if (auth.isBarbero()) {
    const slug = auth.getUser()?.tenantId;
    router.navigate(slug ? ['/', slug, 'mi-agenda'] : ['/mi-agenda']);
    return false;
  }
  return true;
};
