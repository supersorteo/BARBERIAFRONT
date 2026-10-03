import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { AdminComponent } from './pages/admin/admin.component';
import { LoginComponent } from './pages/login/login.component';
import { MiAgendaComponent } from './pages/mi-agenda/mi-agenda.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { SuperAdminComponent } from './pages/superadmin/superadmin.component';
import { CorteoHomeComponent } from './pages/corteo-home/corteo-home.component';
import { adminGuard, barberoGuard, superAdminGuard, alreadyLoggedInGuard } from './auth.guard';
import { superAdminDeactivateGuard } from './guards/superadmin-deactivate.guard';

export const routes: Routes = [
  { path: '',           component: CorteoHomeComponent },
  { path: 'registro',   component: RegistroComponent },
  { path: 'login',      component: LoginComponent,   canActivate: [alreadyLoggedInGuard] },
  { path: 'admin',      component: AdminComponent,      canActivate: [adminGuard] },
  { path: 'mi-agenda',  component: MiAgendaComponent,   canActivate: [barberoGuard] },
  { path: 'superadmin', component: SuperAdminComponent, canActivate: [superAdminGuard], canDeactivate: [superAdminDeactivateGuard] },
  { path: ':slug/login',    component: LoginComponent,     canActivate: [alreadyLoggedInGuard] },
  { path: ':slug/admin',   component: AdminComponent,     canActivate: [adminGuard] },
  { path: ':slug/mi-agenda', component: MiAgendaComponent, canActivate: [barberoGuard] },
  { path: ':slug',          component: LandingComponent },
  { path: '**',         component: CorteoHomeComponent }
];
