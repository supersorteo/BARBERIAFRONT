import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { NegocioService } from '../../negocio.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  form = { username: '', password: '' };
  loading = false;
  error = '';
  nombreNegocio = 'El Corte';
  showPass = false;

  constructor(private auth: AuthService, private router: Router, private negocio: NegocioService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    console.log('[Login] ngOnInit disparado');
    this.negocio.getConfig().subscribe({
      next: c => { if (c?.nombre) { this.nombreNegocio = c.nombre; this.cdr.detectChanges(); } },
      error: () => {}
    });
  }

  submit() {
    if (!this.form.username || !this.form.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.username, this.form.password).subscribe({
      next: (u) => {
        const destino = u.rol === 'BARBERO' ? '/mi-agenda' : '/admin';
        this.router.navigate([destino]);
      },
      error: () => { this.error = 'Usuario o contraseña incorrectos.'; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  onKey(e: KeyboardEvent) { if (e.key === 'Enter') this.submit(); }
}
