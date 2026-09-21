import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  inject(Router).navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn() && auth.isAdmin()) return true;
  inject(Router).navigate(['/login']);
  return false;
};

export const barberoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  inject(Router).navigate(['/login']);
  return false;
};
