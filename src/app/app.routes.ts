import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { AdminComponent } from './pages/admin/admin.component';
import { LoginComponent } from './pages/login/login.component';
import { MiAgendaComponent } from './pages/mi-agenda/mi-agenda.component';
import { adminGuard, barberoGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: 'mi-agenda', component: MiAgendaComponent, canActivate: [barberoGuard] },
  { path: '**', redirectTo: '' }
];
