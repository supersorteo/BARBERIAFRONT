import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  form = { username: '', password: '' };
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (!this.form.username || !this.form.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.username, this.form.password).subscribe({
      next: (u) => {
        const destino = u.rol === 'BARBERO' ? '/mi-agenda' : '/admin';
        this.router.navigate([destino]);
      },
      error: () => { this.error = 'Usuario o contraseña incorrectos.'; this.loading = false; }
    });
  }

  onKey(e: KeyboardEvent) { if (e.key === 'Enter') this.submit(); }
}
