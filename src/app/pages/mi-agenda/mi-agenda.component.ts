import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { NegocioService, Turno, BloqueoHorario, Barbero } from '../../negocio.service';
import { AuthService, AuthUser } from '../../auth.service';
import { AlertService } from '../../shared/alert.service';

interface FotoSlot { file: File | null; preview: string; url: string; }

@Component({
  selector: 'app-mi-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mi-agenda.component.html',
  styleUrl: './mi-agenda.component.css'
})
export class MiAgendaComponent implements OnInit, AfterViewInit, OnDestroy {
  usuario: AuthUser | null = null;

  private _tab: 'agenda' | 'horario' | 'perfil' = 'agenda';
  get tabActiva() { return this._tab; }
  set tabActiva(v: typeof this._tab) {
    this._tab = v;
    setTimeout(() => gsap.from('.mpa-content', { y: 12, opacity: 0, duration: 0.25, ease: 'power2.out' }), 0);
  }

  nombreNegocio = '';
  logoNegocio = '';

  // Agenda
  turnos: Turno[] = [];
  fechaFiltro = new Date().toISOString().split('T')[0];
  cargando = false;
  turnoSeleccionado: Turno | null = null;

  abrirDetalle(t: Turno) { this.turnoSeleccionado = { ...t }; }
  cerrarDetalle() { this.turnoSeleccionado = null; }

  // Perfil propio
  perfilBarbero: Barbero | null = null;
  perfilForm: Partial<Barbero> = { especialidad: '', foto: '' };
  perfilFoto: FotoSlot = { file: null, preview: '', url: '' };
  subiendoFoto = false;
  guardandoPerfil = false;

  // Cambio de contraseña
  cambioPassForm = { actual: '', nueva: '', confirmar: '' };
  guardandoPass = false;
  showPass = { actual: false, nueva: false, conf: false };
  mostrarModalPass = false;

  // Bloqueos propios
  bloqueos: BloqueoHorario[] = [];
  cargandoBloqueos = false;
  mostrarFormBloqueo = false;
  bloqueoForm = this.bloqueoVacio();
  guardandoBloqueo = false;
  errorBloqueo = '';

  constructor(
    private negocio: NegocioService,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.usuario = this.auth.getUser();
    if (!this.usuario) { this.router.navigate(['/login']); return; }
    this.cargar();
    this.cargarBloqueos();
    this.cargarPerfil();
    this.negocio.getConfig().subscribe({ next: c => {
      this.nombreNegocio = c.nombre || '';
      this.logoNegocio = c.logoUrl ? this.negocio.resolveImageUrl(c.logoUrl) : '';
    }});
    this.pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && this.tabActiva === 'agenda') this.cargar();
    }, 60_000);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngAfterViewInit() {
    if (window.innerWidth > 768) {
      gsap.from('.mpa-sidebar', { x: -30, opacity: 0, duration: 0.4, ease: 'power3.out' });
    }
    gsap.from('.mpa-topbar', { y: -20, opacity: 0, duration: 0.35, ease: 'power2.out' });
    gsap.from('.mpa-content', { y: 16, opacity: 0, duration: 0.35, ease: 'power2.out', delay: 0.1 });
  }

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.tabActiva === 'agenda') this.cargar();
  };

  ngOnDestroy() {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  // ── Agenda ───────────────────────────────────────────────────────

  cargar() {
    this.cargando = true;
    this.negocio.getMisTurnos(this.fechaFiltro || undefined).subscribe({
      next: t => { this.turnos = t; this.cargando = false; this.cdr.detectChanges(); },
      error: () => { this.cargando = false; }
    });
  }

  limpiarFecha() { this.fechaFiltro = ''; this.cargar(); }

  cambiarEstado(t: Turno, estado: string) {
    this.alert.confirm({
      title: estado === 'COMPLETADO' ? '¿Marcar completado?' : '¿Cancelar turno?',
      html: `El turno de <strong>${this.esc(t.paciente)}</strong> quedará <strong>${estado === 'COMPLETADO' ? 'completado' : 'cancelado'}</strong>.`,
      confirmText: estado === 'COMPLETADO' ? 'Sí, completar' : 'Sí, cancelar',
      danger: estado === 'CANCELADO',
    }).then(confirmed => {
      if (!confirmed) return;
      this.negocio.actualizarEstado(t.id!, estado).subscribe({
        next: actualizado => {
          t.estado = actualizado.estado;
          // abrirDetalle hace spread-copy, hay que actualizar el original en el array
          const orig = this.turnos.find(tu => tu.id === actualizado.id);
          if (orig) orig.estado = actualizado.estado;
          if (this.turnoSeleccionado?.id === t.id) {
            this.turnoSeleccionado = { ...t };
          }
          if (estado === 'COMPLETADO') this.alert.success('Turno completado ✓');
          else this.alert.success('Turno cancelado');
          this.cerrarDetalle();
          this.cdr.detectChanges();
        },
        error: () => this.alert.error('Error al cambiar el estado')
      });
    });
  }

  estadoBadge(estado: string) {
    if (estado === 'RESERVADO')  return 'mpanel-badge mpanel-badge--reservado';
    if (estado === 'COMPLETADO') return 'mpanel-badge mpanel-badge--completado';
    if (estado === 'CANCELADO')  return 'mpanel-badge mpanel-badge--cancelado';
    return 'mpanel-badge';
  }

  // ── Bloqueos ─────────────────────────────────────────────────────

  cargarBloqueos() {
    this.cargandoBloqueos = true;
    this.negocio.getMisBloqueos().subscribe({
      next: b => { this.bloqueos = b; this.cargandoBloqueos = false; this.cdr.detectChanges(); },
      error: () => { this.cargandoBloqueos = false; }
    });
  }

  abrirFormBloqueo() {
    this.bloqueoForm = this.bloqueoVacio();
    this.errorBloqueo = '';
    this.mostrarFormBloqueo = true;
    setTimeout(() => gsap.from('.mpanel-bloqueo-form', { y: -10, opacity: 0, duration: 0.25, ease: 'power2.out' }), 0);
  }

  onDiaLibreChange() {
    if (this.bloqueoForm['diaLibre']) {
      this.bloqueoForm.horaInicio = '00:00';
      this.bloqueoForm.horaFin = '23:59';
    }
  }

  guardarBloqueo() {
    if (!this.bloqueoForm.fecha) { this.errorBloqueo = 'La fecha es obligatoria.'; return; }
    const hoy = new Date().toISOString().split('T')[0];
    if (this.bloqueoForm.fecha < hoy) { this.errorBloqueo = 'No podés bloquear fechas pasadas.'; return; }
    this.guardandoBloqueo = true;
    this.errorBloqueo = '';
    this.negocio.crearMiBloqueo(this.bloqueoForm).subscribe({
      next: () => {
        this.mostrarFormBloqueo = false;
        this.guardandoBloqueo = false;
        this.cargarBloqueos();
        this.alert.success('Bloqueo registrado');
      },
      error: () => {
        this.errorBloqueo = 'Error al guardar. Intentá de nuevo.';
        this.guardandoBloqueo = false;
      }
    });
  }

  eliminarBloqueo(id: number) {
    this.alert.confirm({
      title: '¿Eliminar bloqueo?',
      html: 'El horario quedará disponible nuevamente para reservas.',
      confirmText: 'Sí, eliminar',
    }).then(confirmed => {
      if (!confirmed) return;
      this.negocio.eliminarMiBloqueo(id).subscribe({
        next: () => { this.cargarBloqueos(); this.alert.success('Bloqueo eliminado'); },
        error: () => this.alert.error('Error al eliminar el bloqueo')
      });
    });
  }

  esDiaLibre(b: BloqueoHorario) {
    return b.horaInicio === '00:00' && b.horaFin === '23:59';
  }

  // ── Perfil propio ─────────────────────────────────────────────

  cargarPerfil() {
    this.negocio.getBarberos().subscribe({
      next: barberos => {
        const mio = barberos.find(b => b.id === this.usuario?.barberoId);
        if (mio) {
          this.perfilBarbero = mio;
          this.perfilForm = { especialidad: mio.especialidad || '', foto: mio.foto || '' };
          this.perfilFoto = { file: null, preview: mio.foto ? this.negocio.resolveImageUrl(mio.foto) : '', url: mio.foto || '' };
          this.cdr.detectChanges();
        }
      }
    });
  }

  onFotoSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.perfilFoto = { file, preview: e.target!.result as string, url: '' };
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  eliminarFotoPerfil() {
    this.perfilFoto = { file: null, preview: '', url: '' };
    this.perfilForm.foto = '';
  }

  img(url: string | undefined): string {
    return this.negocio.resolveImageUrl(url);
  }

  guardarPerfil() {
    this.guardandoPerfil = true;
    const persistir = () => {
      this.negocio.actualizarMiPerfil(this.perfilForm).subscribe({
        next: () => {
          this.guardandoPerfil = false;
          this.alert.success('Perfil actualizado');
          this.cargarPerfil();
        },
        error: () => { this.guardandoPerfil = false; this.alert.error('Error al guardar el perfil'); }
      });
    };
    if (this.perfilFoto.file) {
      this.subiendoFoto = true;
      this.negocio.uploadImagen(this.perfilFoto.file).subscribe({
        next: res => { this.subiendoFoto = false; this.perfilForm.foto = res.url; persistir(); },
        error: () => { this.subiendoFoto = false; this.guardandoPerfil = false; this.alert.error('Error al subir la foto'); }
      });
    } else {
      this.perfilForm.foto = this.perfilFoto.url || this.perfilForm.foto || '';
      persistir();
    }
  }

  abrirModalPass() {
    this.cambioPassForm = { actual: '', nueva: '', confirmar: '' };
    this.showPass = { actual: false, nueva: false, conf: false };
    this.mostrarModalPass = true;
  }

  guardarPassword() {
    const { actual, nueva, confirmar } = this.cambioPassForm;
    if (!actual || !nueva) { this.alert.error('Completá todos los campos.'); return; }
    if (nueva !== confirmar) { this.alert.error('Las contraseñas nuevas no coinciden.'); return; }
    this.alert.confirm({
      title: '¿Cambiar contraseña?',
      html: 'Vas a actualizar tu contraseña. Asegurate de recordar la nueva antes de confirmar.',
      confirmText: 'Sí, cambiar',
    }).then(confirmed => {
      if (!confirmed) return;
      this.guardandoPass = true;
      this.negocio.cambiarMiPassword(actual, nueva).subscribe({
        next: () => {
          this.guardandoPass = false;
          this.mostrarModalPass = false;
          this.cambioPassForm = { actual: '', nueva: '', confirmar: '' };
          this.alert.success('Contraseña actualizada correctamente');
          this.cdr.detectChanges();
        },
        error: err => {
          this.guardandoPass = false;
          this.alert.error(err.error?.error || 'Contraseña actual incorrecta.');
        }
      });
    });
  }

  cerrarSesion() {
    this.alert.confirm({
      title: '¿Cerrar sesión?',
      html: 'Tu sesión se cerrará. Necesitarás ingresar tus credenciales nuevamente.',
      confirmText: 'Sí, salir',
      cancelText: 'Quedarme',
    }).then(confirmed => {
      if (!confirmed) return;
      const slug = this.usuario?.tenantId;
      this.auth.logout();
      this.router.navigate([slug ? `/${slug}/login` : '/login']);
    });
  }

  irAlSitio() {
    const slug = this.usuario?.tenantId;
    if (slug) {
      sessionStorage.setItem('desde-panel', '1');
      this.router.navigate([`/${slug}`]);
    }
  }

  // ── Sidebar ───────────────────────────────────────────────────
  sidebarCollapsed = false;
  sidebarOpen = false;
  toggleSidebar() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = !this.sidebarOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  // ── Navegación de fecha ───────────────────────────────────────
  diaAnterior() {
    const d = new Date(this.fechaFiltro + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    this.fechaFiltro = d.toISOString().split('T')[0];
    this.cargar();
  }
  diaSiguiente() {
    const d = new Date(this.fechaFiltro + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    this.fechaFiltro = d.toISOString().split('T')[0];
    this.cargar();
  }
  irAHoy() { this.fechaFiltro = new Date().toISOString().split('T')[0]; this.cargar(); }
  esHoy(): boolean { return this.fechaFiltro === new Date().toISOString().split('T')[0]; }

  fechaLegible(): string {
    const [y, m, d] = this.fechaFiltro.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${dias[fecha.getDay()]} ${d} de ${meses[m - 1]}`;
  }

  // ── KPI cards ─────────────────────────────────────────────────
  get kpiTotal(): number { return this.turnos.length; }
  get kpiCompletados(): number { return this.turnos.filter(t => t.estado === 'COMPLETADO').length; }
  get kpiPendientes(): number { return this.turnos.filter(t => t.estado === 'RESERVADO').length; }
  get kpiCancelados(): number { return this.turnos.filter(t => t.estado === 'CANCELADO').length; }

  // ── Próximas citas ────────────────────────────────────────────
  get proximasCitas(): Turno[] {
    if (!this.esHoy()) return this.turnos.filter(t => t.estado === 'RESERVADO').slice(0, 5);
    const ahora = new Date();
    const horaActual = `${ahora.getHours().toString().padStart(2,'0')}:${ahora.getMinutes().toString().padStart(2,'0')}`;
    return this.turnos.filter(t => t.estado === 'RESERVADO' && t.hora >= horaActual).slice(0, 5);
  }

  // ── Timeline ──────────────────────────────────────────────────
  private minTL = 8 * 60;
  private maxTL = 20 * 60;
  private get spanTL(): number { return this.maxTL - this.minTL; }

  tlTop(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return Math.max(0, Math.min(100, ((h * 60 + m) - this.minTL) / this.spanTL * 100));
  }
  tlHeight(hora: string, horaFin?: string): number {
    const [h, m] = hora.split(':').map(Number);
    const ini = h * 60 + m;
    let fin = ini + 45;
    if (horaFin) { const [fh, fm] = horaFin.split(':').map(Number); fin = fh * 60 + fm; }
    return Math.max(4, (fin - ini) / this.spanTL * 100);
  }
  get horasTL(): number[] {
    return Array.from({ length: (this.maxTL - this.minTL) / 60 }, (_, i) => this.minTL / 60 + i);
  }
  fmtHora(h: number): string { return `${String(h).padStart(2,'0')}:00`; }

  waRecordatorio(t: Turno): string {
    if (!t.telefono) return '';
    const tel = t.telefono.replace(/\D/g, '');
    const negocio = this.nombreNegocio || 'la barbería';
    const msg = `Hola ${t.paciente}! Te recordamos tu turno en ${negocio} para el ${t.fecha} a las ${t.hora}. ¡Te esperamos!`;
    return `https://wa.me/598${tel}?text=${encodeURIComponent(msg)}`;
  }

  private esc(v: string) {
    return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  private bloqueoVacio(): BloqueoHorario & { diaLibre?: boolean } {
    return { barberoId: 0, fecha: '', horaInicio: '09:00', horaFin: '10:00', motivo: '', diaLibre: false };
  }
}
