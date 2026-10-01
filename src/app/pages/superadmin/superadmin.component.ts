import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SuperAdminService, TenantResumen, Resumen, CodigoItem } from '../../superadmin.service';
import { AuthService } from '../../auth.service';
import { AlertService } from '../../shared/alert.service';
import { SuperAdminDeactivatable } from '../../guards/superadmin-deactivate.guard';

@Component({
  selector: 'app-superadmin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin.component.html',
  styleUrl: './superadmin.component.css'
})
export class SuperAdminComponent implements OnInit, SuperAdminDeactivatable {
  allowNavigation = false;
  resumen: Resumen | null = null;
  tenants: TenantResumen[] = [];
  codigos: CodigoItem[] = [];
  cantidad = 1;
  generando = false;
  mensajeCodigo = '';
  errorCodigo = '';
  togglingSlug = '';
  cargando = true;

  readonly DEMO_SLUG = 'barberia-demo';

  constructor(
    private sa: SuperAdminService,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.sa.getResumen().subscribe({
      next: (r) => { this.resumen = r; this.cdr.detectChanges(); },
      error: () => { this.cdr.detectChanges(); }
    });
    this.sa.getTenants().subscribe({
      next: (t) => { this.tenants = t; this.cargando = false; this.cdr.detectChanges(); },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });
    this.sa.getCodigos().subscribe({
      next: (c) => { this.codigos = c; this.cdr.detectChanges(); },
      error: () => { this.cdr.detectChanges(); }
    });
  }

  eliminandoSlug = '';
  reseteandoSlug = '';
  credencialReset: { username: string; password: string; slug: string } | null = null;

  resetPassword(t: TenantResumen): void {
    this.alert.confirm({
      title: `Resetear contraseña de "${t.nombre}"`,
      html: `Se generará una contraseña nueva para <strong>${t.adminUsername}</strong>. La contraseña actual quedará inválida.`,
      confirmText: 'Sí, resetear',
      cancelText: 'Cancelar',
    }).then(confirmed => {
      if (!confirmed) return;
      this.reseteandoSlug = t.slug;
      this.sa.resetPassword(t.slug).subscribe({
        next: res => {
          this.reseteandoSlug = '';
          this.credencialReset = { ...res, slug: t.slug };
          this.cdr.detectChanges();
        },
        error: () => {
          this.reseteandoSlug = '';
          this.alert.error('Error al resetear la contraseña');
          this.cdr.detectChanges();
        }
      });
    });
  }

  copiarCredencial(): void {
    if (!this.credencialReset) return;
    const texto = `Usuario: ${this.credencialReset.username}\nContraseña: ${this.credencialReset.password}`;
    navigator.clipboard.writeText(texto)
      .then(() => this.alert.success('Credenciales copiadas'))
      .catch(() => this.alert.error('No se pudo copiar'));
  }

  showResetPass: Record<string, boolean> = {};
  toggleResetPassView(slug: string): void {
    this.showResetPass[slug] = !this.showResetPass[slug];
    this.cdr.detectChanges();
  }

  eliminarTenant(t: TenantResumen): void {
    this.alert.confirm({
      title: `Eliminar "${t.nombre}"`,
      html: `
        <p style="margin-bottom:10px">Esta acción es <strong>irreversible</strong>. Se eliminará:</p>
        <div style="text-align:left;font-size:13px;line-height:2">
          <div>🗑️ El negocio y su configuración</div>
          <div>🗑️ El admin y todos sus barberos</div>
          <div>🗑️ Servicios, turnos y galería</div>
        </div>`,
      confirmText: 'Sí, eliminar todo',
      cancelText: 'Cancelar',
    }).then(confirmed => {
      if (!confirmed) return;
      this.eliminandoSlug = t.slug;
      this.alert.loading('Eliminando...');
      this.sa.eliminarTenant(t.slug).subscribe({
        next: () => {
          this.alert.close();
          this.tenants = this.tenants.filter(x => x.slug !== t.slug);
          if (this.resumen) {
            this.resumen = {
              ...this.resumen,
              totalTenants: this.resumen.totalTenants - 1,
              tenantActivos: t.activo ? this.resumen.tenantActivos - 1 : this.resumen.tenantActivos,
              totalAdmins: this.resumen.totalAdmins - 1,
            };
          }
          this.eliminandoSlug = '';
          this.cdr.detectChanges();
          this.alert.success('Barbería eliminada', `"${t.nombre}" fue eliminada correctamente.`);
        },
        error: (e) => {
          this.alert.close();
          this.eliminandoSlug = '';
          this.alert.error(e?.error?.error || 'Error al eliminar la barbería');
          this.cdr.detectChanges();
        }
      });
    });
  }

  toggleTenant(slug: string): void {
    if (this.togglingSlug || slug === this.DEMO_SLUG) return;
    const t = this.tenants.find(x => x.slug === slug);
    if (!t) return;
    const desactivando = t.activo;
    this.alert.confirm({
      title: desactivando ? `¿Desactivar "${t.nombre}"?` : `¿Activar "${t.nombre}"?`,
      html: desactivando
        ? `El admin y los barberos de <strong>${t.nombre}</strong> perderán acceso de inmediato.`
        : `<strong>${t.nombre}</strong> volverá a estar operativa.`,
      confirmText: desactivando ? 'Sí, desactivar' : 'Sí, activar',
      cancelText: 'Cancelar',
    }).then(confirmed => {
      if (!confirmed) return;
      this.togglingSlug = slug;
      this.sa.toggleTenant(slug).subscribe({
        next: (res) => {
          t.activo = res.activo;
          if (this.resumen) this.resumen = { ...this.resumen, tenantActivos: this.resumen.tenantActivos + (res.activo ? 1 : -1) };
          this.togglingSlug = '';
          this.cdr.detectChanges();
          const msg = res.activo ? 'Barbería activada' : 'Barbería desactivada';
          const sub = res.activo ? `"${t.nombre}" volvió a estar operativa.` : `"${t.nombre}" ya no tiene acceso.`;
          this.alert.success(msg, sub);
        },
        error: () => {
          this.togglingSlug = '';
          this.alert.error('Error al cambiar el estado de la barbería');
          this.cdr.detectChanges();
        }
      });
    });
  }

  generarCodigos(): void {
    const n = Math.floor(this.cantidad);
    if (n < 1 || n > 50) {
      this.errorCodigo = 'Ingresá una cantidad entre 1 y 50.';
      this.cdr.detectChanges();
      return;
    }
    this.generando = true;
    this.mensajeCodigo = '';
    this.errorCodigo = '';
    this.sa.generarCodigos(n).subscribe({
      next: (nuevos) => {
        const items: CodigoItem[] = nuevos.map(c => ({
          codigo: c.codigo, usado: false, usadoPorUsername: null, usadoAt: null, creadoAt: c.creadoAt
        }));
        this.codigos = [...items, ...this.codigos];
        if (this.resumen) this.resumen = { ...this.resumen, codigosDisponibles: this.resumen.codigosDisponibles + n };
        this.mensajeCodigo = `${n} código${n > 1 ? 's generados' : ' generado'} correctamente.`;
        this.generando = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.mensajeCodigo = ''; this.cdr.detectChanges(); }, 4000);
      },
      error: () => {
        this.errorCodigo = 'Error al generar los códigos.';
        this.generando = false;
        this.cdr.detectChanges();
      }
    });
  }

  copiar(codigo: string): void {
    navigator.clipboard.writeText(codigo)
      .then(() => this.alert.success('Código copiado', codigo))
      .catch(() => this.alert.error('No se pudo copiar', 'Copiá el código manualmente.'));
  }

  urlSitio(slug: string): string {
    return `${window.location.origin}/${slug}`;
  }

  copiarUrl(slug: string): void {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url)
      .then(() => this.alert.success('URL copiada', url))
      .catch(() => this.alert.error('No se pudo copiar', 'Copiá la URL manualmente.'));
  }

  irAlLanding(): void {
    this.allowNavigation = true;
    this.router.navigate(['/barberia-demo', 'login']);
  }

  logout(): void {
    this.alert.confirm({
      title: '¿Cerrar sesión?',
      html: 'Saldrás del panel de super administración.',
      confirmText: 'Sí, salir',
      cancelText: 'Quedarme',
    }).then(confirmed => {
      if (!confirmed) return;
      this.allowNavigation = true;
      this.auth.logout();
      this.router.navigate(['/barberia-demo', 'login']);
    });
  }
}
