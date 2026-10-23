import { Routes } from '@angular/router';
import { adminGuard, barberoGuard, superAdminGuard, alreadyLoggedInGuard } from './auth.guard';
import { superAdminDeactivateGuard } from './guards/superadmin-deactivate.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/corteo-home/corteo-home.component').then(m => m.CorteoHomeComponent) },
  { path: 'registro', loadComponent: () => import('./pages/registro/registro.component').then(m => m.RegistroComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [alreadyLoggedInGuard] },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent), canActivate: [adminGuard] },
  { path: 'mi-agenda', loadComponent: () => import('./pages/mi-agenda/mi-agenda.component').then(m => m.MiAgendaComponent), canActivate: [barberoGuard] },
  { path: 'superadmin', loadComponent: () => import('./pages/superadmin/superadmin.component').then(m => m.SuperAdminComponent), canActivate: [superAdminGuard], canDeactivate: [superAdminDeactivateGuard] },
  { path: ':slug/login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [alreadyLoggedInGuard] },
  { path: ':slug/admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent), canActivate: [adminGuard] },
  { path: ':slug/mi-agenda', loadComponent: () => import('./pages/mi-agenda/mi-agenda.component').then(m => m.MiAgendaComponent), canActivate: [barberoGuard] },
  { path: ':slug', loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
  { path: '**', loadComponent: () => import('./pages/corteo-home/corteo-home.component').then(m => m.CorteoHomeComponent) }
];
