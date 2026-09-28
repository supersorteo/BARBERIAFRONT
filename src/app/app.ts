import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SuperAdminLoginComponent } from './components/superadmin-login/superadmin-login.component';

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

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      this.showSuperLogin = true;
    }
  }
}
