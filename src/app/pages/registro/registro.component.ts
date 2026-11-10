import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ActivacionModalComponent } from '../../components/activacion-modal/activacion-modal.component';
import { AuthService } from '../../auth.service';
import { BORRADOR_REGISTRO_KEY, CODIGO_PAGO_KEY, ESPERANDO_CODIGO_KEY } from '../../pago.service';

interface RegistroResponse {
  slug: string;
  username: string;
  panelUrl: string;
  mensaje: string;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ActivacionModalComponent],
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
  showPass    = false;
  showConfirm = false;
  contador    = 3;
  mostrarModalActivacion = false;
  codigoListo = false;
  esperandoCodigo = false;

  private readonly apiUrl = environment.apiBase.replace('/api/v1', '') + '/api/registro';

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef, private auth: AuthService) {
    this.restaurarPagoYBorrador();
  }

  guardarBorrador(): void {
    try {
      sessionStorage.setItem(BORRADOR_REGISTRO_KEY, JSON.stringify({
        nombreNegocio: this.form.nombreNegocio,
        adminNombre: this.form.adminNombre,
        username: this.form.username
      }));
    } catch { /* storage bloqueado */ }
  }

  private restaurarPagoYBorrador(): void {
    try {
      const codigo = sessionStorage.getItem(CODIGO_PAGO_KEY);
      if (codigo) {
        this.form.codigoInvitacion = codigo;
        this.codigoListo = true;
      }
      this.esperandoCodigo = !codigo && sessionStorage.getItem(ESPERANDO_CODIGO_KEY) === '1';
      this.mostrarModalActivacion = this.esperandoCodigo;
      const borrador = sessionStorage.getItem(BORRADOR_REGISTRO_KEY);
      if (borrador) {
        const d = JSON.parse(borrador);
        this.form.nombreNegocio = String(d?.nombreNegocio ?? '').slice(0, 60);
        this.form.adminNombre = String(d?.adminNombre ?? '').slice(0, 60);
        this.form.username = String(d?.username ?? '').slice(0, 30);
        this.onNombreChange();
      }
    } catch { /* storage bloqueado o borrador corrupto */ }
  }

  private limpiarPago(): void {
    try {
      sessionStorage.removeItem(CODIGO_PAGO_KEY);
      sessionStorage.removeItem(BORRADOR_REGISTRO_KEY);
      sessionStorage.removeItem(ESPERANDO_CODIGO_KEY);
    } catch { /* storage bloqueado */ }
  }

  get pasoInicialModal(): 'pais' | 'codigo' {
    return this.codigoListo || this.esperandoCodigo ? 'codigo' : 'pais';
  }

  get codigoInicialModal(): string {
    return this.codigoListo ? this.form.codigoInvitacion : '';
  }

  marcarEsperandoCodigo(): void {
    this.esperandoCodigo = true;
    try { sessionStorage.setItem(ESPERANDO_CODIGO_KEY, '1'); } catch { /* storage bloqueado */ }
  }

  cerrarModal(): void {
    this.mostrarModalActivacion = false;
    this.esperandoCodigo = false;
    try { sessionStorage.removeItem(ESPERANDO_CODIGO_KEY); } catch { /* storage bloqueado */ }
  }

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

  private validarSinCodigo(): string | null {
    const { nombreNegocio, adminNombre, username, password, confirmar } = this.form;
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

  private validar(): string | null {
    if (!this.form.codigoInvitacion.trim())
      return 'Ingresá el código de activación para continuar.';
    return this.validarSinCodigo();
  }

  onClickRegistrar(): void {
    const err = this.validarSinCodigo();
    if (err) { this.error = err; return; }
    this.error = '';
    this.mostrarModalActivacion = true;
  }

  onCodigoConfirmado(codigo: string): void {
    this.cerrarModal();
    this.form.codigoInvitacion = codigo;
    const err = this.validarSinCodigo();
    if (err) {
      this.codigoListo = true;
      try { sessionStorage.setItem(CODIGO_PAGO_KEY, codigo); } catch { /* storage bloqueado */ }
      this.error = err;
      return;
    }
    this.submit();
  }

  private submit(): void {
    const err = this.validar();
    if (err) { this.error = err; return; }
    this.loading = true;
    this.error = '';
    this.http.post<RegistroResponse>(this.apiUrl, {
      nombreNegocio:    this.form.nombreNegocio,
      adminNombre:      this.form.adminNombre,
      username:         this.form.username,
      password:         this.form.password,
      codigoInvitacion: this.form.codigoInvitacion
    }).subscribe({
      next: (res) => {
        this.limpiarPago();
        this.resultado = res;
        this.vista     = 'exito';
        this.loading   = false;
        this.contador  = 3;
        this.cdr.detectChanges();
        const tick = setInterval(() => {
          this.contador--;
          this.cdr.detectChanges();
          if (this.contador <= 0) { clearInterval(tick); this.irAMiBarberia(); }
        }, 1000);
      },
      error: (e) => {
        this.error   = e?.error?.message ?? e?.error?.error ?? 'Ocurrió un error. Intentá de nuevo.';
        if (e?.status === 403 && this.codigoListo) {
          this.limpiarPago();
          this.codigoListo = false;
          this.form.codigoInvitacion = '';
        }
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
    this.auth.logout();
    try { localStorage.setItem('lastRegisteredSlug', slug); } catch {}
    this.router.navigate(['/', slug, 'login'], {
      replaceUrl: true,
      state: { registroUsername: this.form.username }
    });
  }

  copiarUrl(): void {
    try { navigator.clipboard.writeText(this.urlPublica); } catch { /* sin soporte */ }
  }
}
