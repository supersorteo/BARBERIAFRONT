import { Component, HostListener } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SuperAdminLoginComponent } from './components/superadmin-login/superadmin-login.component';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SuperAdminLoginComponent],
  template: `
    <router-outlet />
    @if (showSuperLogin) {
      <app-superadmin-login (cerrar)="showSuperLogin = false" />
    }
  `
})
export class App {
  showSuperLogin = false;

  constructor(private auth: AuthService, private router: Router) {}

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      if (this.auth.isSuperAdmin()) {
        this.router.navigate(['/superadmin']);
      } else {
        this.showSuperLogin = true;
      }
    }
  }
}
