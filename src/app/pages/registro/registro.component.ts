import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface RegistroResponse {
  slug: string;
  username: string;
  panelUrl: string;
  mensaje: string;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {
  vista: 'form' | 'exito' = 'form';
  form = { nombreNegocio: '', adminNombre: '', username: '', password: '', confirmar: '', codigoInvitacion: '' };
  slugPreview = '';
  loading = false;
  error = '';
  resultado: RegistroResponse | null = null;
  showPass = false;
  showConfirm = false;
  contador = 3;

  private readonly apiUrl = environment.apiBase.replace('/api/v1', '') + '/api/registro';

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) {}

  onNombreChange(): void {
    this.slugPreview = this.generarSlug(this.form.nombreNegocio);
  }

  private generarSlug(nombre: string): string {
    return nombre
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 40);
  }

  private validar(): string | null {
    const { nombreNegocio, adminNombre, username, password, confirmar, codigoInvitacion } = this.form;
    if (!codigoInvitacion.trim())
      return 'Ingresá el código de invitación para continuar.';
    if (!nombreNegocio.trim() || nombreNegocio.length < 2 || nombreNegocio.length > 60)
      return 'El nombre del negocio debe tener entre 2 y 60 caracteres.';
    if (!adminNombre.trim() || adminNombre.length < 2 || adminNombre.length > 60)
      return 'Tu nombre debe tener entre 2 y 60 caracteres.';
    if (!username || username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9._-]+$/.test(username))
      return 'El usuario debe tener 3-30 caracteres (letras, números, puntos, guiones, underscore).';
    if (!password || password.length < 8)
      return 'La contraseña debe tener al menos 8 caracteres.';
    if (password !== confirmar)
      return 'Las contraseñas no coinciden.';
    return null;
  }

  submit(): void {
    const err = this.validar();
    if (err) { this.error = err; return; }
    this.loading = true;
    this.error = '';
    this.http.post<RegistroResponse>(this.apiUrl, {
      nombreNegocio: this.form.nombreNegocio,
      adminNombre: this.form.adminNombre,
      username: this.form.username,
      password: this.form.password,
      codigoInvitacion: this.form.codigoInvitacion
    }).subscribe({
      next: (res) => {
        this.resultado = res;
        this.vista = 'exito';
        this.loading = false;
        this.contador = 3;
        this.cdr.detectChanges();
        const tick = setInterval(() => {
          this.contador--;
          this.cdr.detectChanges();
          if (this.contador <= 0) {
            clearInterval(tick);
            this.irAMiBarberia();
          }
        }, 1000);
      },
      error: (e) => {
        this.error = e?.error?.message ?? e?.error?.error ?? 'Ocurrió un error. Intentá de nuevo.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get urlPublica(): string {
    return window.location.origin + '/' + (this.resultado?.slug ?? '');
  }

  irAMiBarberia(): void {
    const slug = this.resultado!.slug;
    try { localStorage.setItem('lastRegisteredSlug', slug); } catch {}
    this.router.navigate(['/', slug, 'login'], { replaceUrl: true });
  }

  copiarUrl(): void {
    try { navigator.clipboard.writeText(this.urlPublica); } catch { /* sin soporte */ }
  }
}
