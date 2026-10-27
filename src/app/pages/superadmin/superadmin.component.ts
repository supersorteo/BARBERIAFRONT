import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SuperAdminService, TenantResumen, Resumen, CodigoItem, PlanPrecio, TipoCodigo } from '../../superadmin.service';
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
export class SuperAdminComponent implements OnInit, OnDestroy, SuperAdminDeactivatable {
  allowNavigation = false;
  private manifestLink: HTMLLinkElement | null = null;
  private reload$ = new Subject<void>();
  resumen: Resumen | null = null;
  tenants: TenantResumen[] = [];
  codigos: CodigoItem[] = [];
  cantidad = 1;
  tipoGeneracion: string = 'PLAN_1M';
  filtroTipo: string = 'todos';
  generando = false;
  mensajeCodigo = '';
  errorCodigo = '';
  planPrecios: PlanPrecio[] = [];
  eliminandoLegacy = false;
  preciosModal: {
    pais: 'UY' | 'AR' | null;
    tasaUyu: number;
    tasaArs: number;
    planes: { tipo: TipoCodigo; usd: number }[];
    guardando: boolean;
  } | null = null;
  togglingSlug = '';
  cargando = true;

  readonly DEMO_SLUG = 'barberia-demo';

  constructor(
    private sa: SuperAdminService,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router,
    readonly cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    if (this.manifestLink) this.manifestLink.href = '/manifest.webmanifest';
    this.reload$.next();
    this.reload$.complete();
  }

  ngOnInit(): void {
    this.manifestLink = document.querySelector('link[rel="manifest"]');
    if (this.manifestLink) this.manifestLink.href = '/manifest-admin.webmanifest';
    this.cargar();
    // Guardar de dónde vino el super admin para poder volver al salir
    const prevUrl = this.router.lastSuccessfulNavigation()?.previousNavigation?.finalUrl?.toString();
    if (prevUrl && prevUrl !== '/superadmin') {
      try { sessionStorage.setItem('sa_return_url', prevUrl); } catch {}
    }
  }

  private returnUrl(): string {
    try { return sessionStorage.getItem('sa_return_url') || '/'; } catch { return '/'; }
  }

  private loginUrlFrom(url: string): string {
    const match = url.match(/^\/([^\/]+)/);
    const slug = match?.[1];
    return (slug && !['superadmin', 'admin', 'login', 'registro'].includes(slug))
      ? `/${slug}/login`
      : '/';
  }

  cargar(): void {
    this.reload$.next(); // cancela cualquier carga anterior en vuelo
    this.cargando = true;
    this.cdr.detectChanges();

    const until$ = this.reload$;

    this.sa.getResumen().pipe(takeUntil(until$)).subscribe({
      next: (r) => { this.resumen = r; this.cdr.detectChanges(); },
      error: () => { this.cdr.detectChanges(); }
    });

    this.sa.getTenants().pipe(takeUntil(until$)).subscribe({
      next: (t) => { this.tenants = t; this.cargando = false; this.cdr.detectChanges(); },
      error: () => { this.cargando = false; this.cdr.detectChanges(); }
    });

    this.sa.getCodigos().pipe(takeUntil(until$)).subscribe({
      next: (c) => { this.codigos = c; this.cdr.detectChanges(); },
      error: () => { this.cdr.detectChanges(); }
    });

    this.sa.getPlanPrecios().pipe(takeUntil(until$)).subscribe({
      next: (p) => { this.planPrecios = p; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  abrirPreciosModal(): void {
    const base = this.planPrecios.find(p => p.precioUsd > 0) ?? this.planPrecios[0];
    const tasaUyu = base?.precioUsd > 0 ? +(base.precioUyu / base.precioUsd).toFixed(2) : 40;
    const tasaArs = base?.precioUsd > 0 ? +(base.precioArs / base.precioUsd).toFixed(2) : 1500;
    this.preciosModal = {
      pais: null,
      tasaUyu,
      tasaArs,
      planes: this.planPrecios.map(p => ({ tipo: p.tipo as TipoCodigo, usd: p.precioUsd })),
      guardando: false
    };
    this.cdr.detectChanges();
  }

  cerrarPreciosModal(): void {
    if (this.preciosModal?.guardando) return;
    this.preciosModal = null;
    this.cdr.detectChanges();
  }

  seleccionarPaisModal(pais: 'UY' | 'AR' | null): void {
    if (!this.preciosModal) return;
    this.preciosModal.pais = pais;
    this.cdr.detectChanges();
  }

  getTasaActual(): number {
    if (!this.preciosModal?.pais) return 0;
    return this.preciosModal.pais === 'UY' ? this.preciosModal.tasaUyu : this.preciosModal.tasaArs;
  }

  onTasaChange(valor: number): void {
    if (!this.preciosModal) return;
    const v = +valor || 0;
    if (this.preciosModal.pais === 'UY') this.preciosModal.tasaUyu = v;
    else this.preciosModal.tasaArs = v;
    this.cdr.detectChanges();
  }

  calcLocal(tipo: TipoCodigo): number {
    if (!this.preciosModal?.pais) return 0;
    const plan = this.preciosModal.planes.find(p => p.tipo === tipo);
    if (!plan) return 0;
    const tasa = this.preciosModal.pais === 'UY' ? this.preciosModal.tasaUyu : this.preciosModal.tasaArs;
    return Math.round(plan.usd * tasa);
  }

  guardarPrecios(): void {
    if (!this.preciosModal?.pais || this.preciosModal.guardando) return;
    this.preciosModal.guardando = true;
    const { tasaUyu, tasaArs, planes } = this.preciosModal;
    const saves = planes.map(plan =>
      this.sa.updatePlanPrecio(plan.tipo, {
        precioUsd: plan.usd,
        precioUyu: Math.round(plan.usd * tasaUyu),
        precioArs: Math.round(plan.usd * tasaArs)
      })
    );
    forkJoin(saves).subscribe({
      next: results => {
        this.planPrecios = results;
        this.preciosModal = null;
        this.cdr.detectChanges();
        this.alert.success('Precios actualizados', 'Los 4 planes fueron actualizados correctamente.');
      },
      error: () => {
        if (this.preciosModal) this.preciosModal.guardando = false;
        this.alert.error('Error al guardar los precios');
        this.cdr.detectChanges();
      }
    });
  }

  eliminarLegacy(): void {
    this.alert.confirm({
      title: 'Eliminar códigos legacy',
      html: 'Se eliminarán todos los códigos <strong>sin tipo de plan</strong> (formato anterior de 10 caracteres). Esta acción es irreversible.',
      confirmText: 'Sí, eliminar legacy',
      cancelText: 'Cancelar',
    }).then(confirmed => {
      if (!confirmed) return;
      this.eliminandoLegacy = true;
      this.sa.eliminarCodigosLegacy().subscribe({
        next: (res) => {
          this.codigos = this.codigos.filter(c => c.tipo !== null);
          this.eliminandoLegacy = false;
          this.cdr.detectChanges();
          this.alert.success('Códigos eliminados', `${res.eliminados} código${res.eliminados !== 1 ? 's' : ''} legacy eliminado${res.eliminados !== 1 ? 's' : ''}.`);
        },
        error: () => {
          this.eliminandoLegacy = false;
          this.alert.error('Error al eliminar los códigos legacy');
          this.cdr.detectChanges();
        }
      });
    });
  }

  eliminandoSlug = '';
  reseteandoSlug = '';
  credencialReset: { username: string; password: string; slug: string } | null = null;

  passModal: { tenant: TenantResumen; modo: 'auto' | 'manual'; customPass: string; showCustomPass: boolean } | null = null;
  passModalError = '';

  editModal: {
    tenant: TenantResumen;
    fechaInicio: string;
    tipoPlan: TipoCodigo;
    fechaVencCalc: string;
    guardando: boolean;
  } | null = null;

  get hoy(): string { return new Date().toISOString().slice(0, 10); }

  abrirPassModal(t: TenantResumen): void {
    this.passModal = { tenant: t, modo: 'auto', customPass: '', showCustomPass: false };
    this.passModalError = '';
    this.cdr.detectChanges();
  }

  cerrarPassModal(): void {
    this.passModal = null;
    this.passModalError = '';
    this.cdr.detectChanges();
  }

  confirmarPassReset(): void {
    if (!this.passModal) return;
    const { tenant, modo, customPass } = this.passModal;
    if (modo === 'manual' && (!customPass || customPass.length < 6)) {
      this.passModalError = 'La contraseña debe tener al menos 6 caracteres.';
      this.cdr.detectChanges();
      return;
    }
    this.reseteandoSlug = tenant.slug;
    const password = modo === 'manual' ? customPass : undefined;
    this.sa.resetPassword(tenant.slug, password).subscribe({
      next: res => {
        this.reseteandoSlug = '';
        this.credencialReset = { ...res, slug: tenant.slug };
        this.cerrarPassModal();
        this.cdr.detectChanges();
      },
      error: () => {
        this.reseteandoSlug = '';
        this.passModalError = 'Error al cambiar la contraseña.';
        this.cdr.detectChanges();
      }
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

  get codigosFiltrados(): CodigoItem[] {
    if (this.filtroTipo === 'todos') return this.codigos;
    if (this.filtroTipo === 'disponibles') return this.codigos.filter(c => !c.usado);
    return this.codigos.filter(c => c.tipo === this.filtroTipo);
  }

  labelTipo(tipo: string | null): string {
    const map: Record<string, string> = {
      PLAN_1M: '1 mes', PLAN_3M: '3 meses', PLAN_6M: '6 meses', PLAN_12M: '12 meses'
    };
    return tipo ? (map[tipo] ?? tipo) : 'Legacy';
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
    this.sa.generarCodigos(n, this.tipoGeneracion).subscribe({
      next: (nuevos) => {
        const items: CodigoItem[] = nuevos.map(c => ({
          codigo: c.codigo,
          tipo: (c.tipo as CodigoItem['tipo']) ?? null,
          usado: false,
          usadoPorUsername: null,
          usadoAt: null,
          fechaVencimiento: null,
          creadoAt: c.creadoAt
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

  abrirEditModal(t: TenantResumen): void {
    const hoy = this.hoy;
    const fechaInicio = t.fechaRegistro ?? hoy;
    const tipoPlan = this.derivarPlan(t.fechaRegistro, t.fechaVencimientoSuscripcion);
    this.editModal = {
      tenant: t,
      fechaInicio,
      tipoPlan,
      fechaVencCalc: this.calcVencimiento(fechaInicio, tipoPlan),
      guardando: false
    };
    this.cdr.detectChanges();
  }

  private derivarPlan(fechaRegistro: string | null, fechaVenc: string | null): TipoCodigo {
    if (!fechaRegistro || !fechaVenc) return 'PLAN_1M';
    const dias = (new Date(fechaVenc + 'T12:00:00').getTime() - new Date(fechaRegistro + 'T12:00:00').getTime()) / 86400000;
    if (dias >= 350) return 'PLAN_12M';
    if (dias >= 170) return 'PLAN_6M';
    if (dias >= 80)  return 'PLAN_3M';
    return 'PLAN_1M';
  }

  cerrarEditModal(): void {
    if (this.editModal?.guardando) return;
    this.editModal = null;
    this.cdr.detectChanges();
  }

  onEditFechaChange(): void {
    if (!this.editModal) return;
    this.editModal.fechaVencCalc = this.calcVencimiento(this.editModal.fechaInicio, this.editModal.tipoPlan);
    this.cdr.detectChanges();
  }

  private calcVencimiento(fechaInicio: string, tipoPlan: TipoCodigo): string {
    const mesesMap: Record<TipoCodigo, number> = { PLAN_1M: 1, PLAN_3M: 3, PLAN_6M: 6, PLAN_12M: 12 };
    const d = new Date(fechaInicio + 'T12:00:00');
    d.setMonth(d.getMonth() + (mesesMap[tipoPlan] ?? 1));
    return d.toISOString().slice(0, 10);
  }

  guardarSuscripcion(): void {
    if (!this.editModal || this.editModal.guardando) return;
    this.editModal.guardando = true;
    const { tenant, fechaInicio, tipoPlan } = this.editModal;
    this.sa.actualizarSuscripcion(tenant.slug, fechaInicio, tipoPlan).subscribe({
      next: (updated) => {
        const idx = this.tenants.findIndex(x => x.slug === updated.slug);
        if (idx >= 0) this.tenants[idx] = updated;
        this.editModal = null;
        this.cdr.detectChanges();
        this.alert.success('Suscripción actualizada', `${updated.nombre} vence el ${updated.fechaVencimientoSuscripcion}`);
      },
      error: () => {
        if (this.editModal) this.editModal.guardando = false;
        this.alert.error('Error al actualizar la suscripción');
        this.cdr.detectChanges();
      }
    });
  }

  copiarUrl(slug: string): void {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url)
      .then(() => this.alert.success('URL copiada', url))
      .catch(() => this.alert.error('No se pudo copiar', 'Copiá la URL manualmente.'));
  }

  irAlLanding(): void {
    this.allowNavigation = true;
    const url = this.returnUrl();
    try { sessionStorage.removeItem('sa_return_url'); } catch {}
    this.router.navigateByUrl(url);
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
      const returnUrl = this.returnUrl();
      try { sessionStorage.removeItem('sa_return_url'); } catch {}
      this.auth.logout();
      this.router.navigateByUrl(returnUrl || '/');
    });
  }
}
