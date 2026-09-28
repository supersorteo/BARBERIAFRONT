import { Component, EventEmitter, HostListener, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin-login.component.html',
  styleUrl: './superadmin-login.component.css'
})
export class SuperAdminLoginComponent {
  @Output() cerrar = new EventEmitter<void>();

  form = { username: '', password: '' };
  loading = false;
  error = '';
  showPass = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cerrar.emit(); }

  submit(): void {
    if (!this.form.username || !this.form.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.username, this.form.password).subscribe({
      next: (u) => {
        if (u.rol === 'SUPER_ADMIN') {
          this.cerrar.emit();
          this.router.navigate(['/superadmin']);
        } else {
          this.auth.logout();
          this.error = 'Acceso denegado.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.error = 'Credenciales incorrectas.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onKey(e: KeyboardEvent): void { if (e.key === 'Enter') this.submit(); }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('sa-overlay')) this.cerrar.emit();
  }
}
