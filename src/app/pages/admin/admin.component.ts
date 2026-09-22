import { Component, OnInit, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { gsap } from 'gsap';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, tap } from 'rxjs';
import {
  NegocioService, Servicio, Turno, Barbero, HorarioBarbero, BloqueoHorario, Galeria, DashboardHoy, ClienteResumen, SlotDisponible
} from '../../negocio.service';
import { AuthService, AuthUser } from '../../auth.service';

interface FotoSlot { file: File | null; preview: string; url: string; }

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, AfterViewInit {
  usuario: AuthUser | null = null;

  private _tabActiva: 'dashboard' | 'turnos' | 'clientes' | 'servicios' | 'barberos' | 'bloqueos' | 'galeria' | 'agente' = 'dashboard';
  get tabActiva() { return this._tabActiva; }
  set tabActiva(v: typeof this._tabActiva) {
    this._tabActiva = v;
    if (v === 'agente' && !this.agenteContextoOriginal) this.cargarContextoAgente();
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        gsap.from('.admin-tab-panel', { y: 28, opacity: 0, duration: 0.38, ease: 'power2.out' });
      }, 0);
    });
  }
  dashboardHoy: DashboardHoy | null = null;

  // Clientes
  clientes: ClienteResumen[] = [];
  clientesFiltro = '';
  cargandoClientes = false;
  clienteExpandido: string | null = null;
  historialCliente: Turno[] = [];
  cargandoHistorial = false;

  // Turnos
  turnos: Turno[] = [];
  fechaFiltro = '';
  reasignandoId: number | null = null;
  reasignarBarberoId = '';

  // Nueva reserva manual (admin)
  mostrarModalReserva = false;
  reservaManualForm = this.reservaManualVacia();
  slotsReservaManual: SlotDisponible[] = [];
  cargandoSlotsManual = false;
  enviandoReservaManual = false;
  errorReservaManual = '';
  turnoConfirmado: { paciente: string; telefono: string; fecha: string; hora: string; barberoNombre: string } | null = null;
  readonly minDate = new Date().toISOString().split('T')[0];

  // Servicios
  servicios: Servicio[] = [];
  mostrarModalServicio = false;
  editandoServicio = false;
  servicioForm: Servicio = this.servicioVacio();
  servicioEditandoId: number | null = null;
  servicioFotos: FotoSlot[] = this.fotoSlotsVacios();
  subiendoFotos = false;

  // Barberos
  barberos: Barbero[] = [];
  mostrarModalBarbero = false;
  editandoBarbero = false;
  barberoForm: Barbero = this.barberoVacio();
  barberoEditandoId: number | null = null;
  barberoFoto: FotoSlot = { file: null, preview: '', url: '' };
  subiendoBarberoFoto = false;
  barberoHorariosId: number | null = null;
  horariosActivos: HorarioBarbero[] = [];
  diasSemana = [2, 3, 4, 5, 6, 7];
  nombreDia = (d: number) => DIAS[d];

  // Bloqueos
  bloqueos: BloqueoHorario[] = [];
  mostrarModalBloqueo = false;
  bloqueoForm: BloqueoHorario = this.bloqueoVacio();

  // Galería
  galeria: Galeria[] = [];
  mostrarModalGaleria = false;
  editandoGaleria = false;
  galeriaForm: Galeria = this.galeriaVacia();
  galeriaEditandoId: number | null = null;
  galeriaFoto: FotoSlot = { file: null, preview: '', url: '' };
  subiendoGaleriaFoto = false;

  // Configuración agente
  agenteContexto = '';
  agenteContextoOriginal = '';
  guardandoContexto = false;
  cargandoContexto = false;

  constructor(
    private negocio: NegocioService,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private router: Router,
    private zone: NgZone
  ) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      gsap.from('.admin-topbar', { y: -28, opacity: 0, duration: 0.5, ease: 'power3.out' });
      gsap.from('.admin-tabs', { y: 20, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.18 });
      gsap.from('.admin-tab-panel', { y: 28, opacity: 0, duration: 0.45, ease: 'power2.out', delay: 0.28 });
    });
  }

  cerrarSesion() { this.auth.logout(); this.router.navigate(['/login']); }

  ngOnInit() {
    this.usuario = this.auth.getUser();
    this.cargarDashboard();
    this.cargarTurnos();
    this.cargarServicios();
    this.cargarBarberos();
    this.cargarBloqueos();
    this.cargarGaleria();
  }

  cargarDashboard() {
    this.negocio.getDashboardHoy().subscribe({
      next: d => {
        this.dashboardHoy = d;
        this.cdr.detectChanges();
        this.animateStatCards();
      },
      error: () => {}
    });
  }

  private animateStatCards() {
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        gsap.from('.stat-card', {
          y: 44, scale: 0.88, opacity: 0, duration: 0.65,
          stagger: 0.1, ease: 'back.out(1.8)'
        });
        document.querySelectorAll('[data-count-admin]').forEach(el => {
          const target = +(el.getAttribute('data-count-admin') || 0);
          const prefix = el.getAttribute('data-prefix') || '';
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target, duration: 1.5, ease: 'power2.out',
            onUpdate: () => { el.textContent = prefix + Math.round(obj.v).toLocaleString('es-UY'); }
          });
        });
      }, 0);
    });
  }

  // ── Clientes ──────────────────────────────────────────────────────

  get clientesFiltrados(): ClienteResumen[] {
    const q = this.clientesFiltro.toLowerCase().trim();
    return q
      ? this.clientes.filter(c => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q))
      : this.clientes;
  }

  cargarClientes() {
    this.cargandoClientes = true;
    this.negocio.getClientes().subscribe({
      next: c => { this.clientes = c; this.cargandoClientes = false; this.cdr.detectChanges(); },
      error: () => { this.cargandoClientes = false; }
    });
  }

  toggleHistorial(nombre: string) {
    if (this.clienteExpandido === nombre) {
      this.clienteExpandido = null;
      this.historialCliente = [];
      return;
    }
    this.clienteExpandido = nombre;
    this.historialCliente = [];
    this.cargandoHistorial = true;
    this.negocio.getHistorialCliente(nombre).subscribe({
      next: t => { this.historialCliente = t; this.cargandoHistorial = false; this.cdr.detectChanges(); },
      error: () => { this.cargandoHistorial = false; }
    });
  }

  // ── Turnos ──────────────────────────────────────────────
  cargandoTurnos = false;
  errorTurnos = '';

  cargarTurnos() {
    this.cargandoTurnos = true;
    this.errorTurnos = '';
    const fecha = this.fechaFiltro || undefined;
    console.log('[Admin] cargarTurnos - filtro fecha:', fecha || 'SIN FILTRO (todos)');
    this.negocio.getTurnos(fecha).subscribe({
      next: t => {
        console.log('[Admin] getTurnos response:', t.length, 'reservas', t.map(r => `#${r.id} ${r.fecha} ${r.hora} ${r.paciente}`));
        this.turnos = t; this.cargandoTurnos = false; this.cdr.detectChanges();
      },
      error: e => { this.errorTurnos = 'Error cargando reservas: ' + (e.message || e.status); this.cargandoTurnos = false; this.cdr.detectChanges(); }
    });
  }
  limpiarFecha() { this.fechaFiltro = ''; this.cargarTurnos(); }

  abrirReasignar(turno: Turno) {
    this.reasignandoId = turno.id!;
    this.reasignarBarberoId = turno.barberoId ? String(turno.barberoId) : '';
  }
  cancelarReasignar() { this.reasignandoId = null; this.reasignarBarberoId = ''; }
  confirmarReasignar(turno: Turno) {
    if (!this.reasignarBarberoId) return;
    this.negocio.reasignarTurno(turno.id!, +this.reasignarBarberoId).subscribe({
      next: t => {
        turno.barberoId = t.barberoId;
        this.reasignandoId = null;
        this.reasignarBarberoId = '';
        this.cdr.detectChanges();
      },
      error: err => {
        alert(err.error?.error || 'No se pudo reasignar. El barbero puede no estar disponible en ese horario.');
        this.cancelarReasignar();
      }
    });
  }

  cambiarEstado(turno: Turno, estado: string) {
    this.negocio.actualizarEstado(turno.id!, estado).subscribe({
      next: t => { turno.estado = t.estado; this.cdr.detectChanges(); }
    });
  }
  nombreBarbero(id?: number) {
    return id ? (this.barberos.find(b => b.id === id)?.nombre ?? '—') : '—';
  }
  estadoBadge(e: string) {
    return e === 'RESERVADO' ? 'status-badge status-reservado' : e === 'COMPLETADO' ? 'status-badge status-completado' : 'status-badge status-cancelado';
  }

  private readonly CAT_ORDEN = ['Corte', 'Barba', 'Combo', 'Coloración'];
  private readonly CAT_EMOJIS: Record<string, string> = { 'Corte': '✂️', 'Barba': '🪒', 'Combo': '💈', 'Coloración': '🎨' };
  private readonly CAT_IMGS: Record<string, string> = {
    'Corte':      '/categorias/corte.jpg',
    'Barba':      '/categorias/barba.jpg',
    'Combo':      '/categorias/combo.jpg',
    'Coloración': '/categorias/coloracion.jpg',
  };

  get serviciosPorCategoria(): { categoria: string; emoji: string; items: Servicio[] }[] {
    const map = new Map<string, Servicio[]>();
    for (const s of this.servicios) {
      const cat = this.negocio.normalizarCategoria(s.categoria || '');
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    const result: { categoria: string; emoji: string; items: Servicio[] }[] = [];
    for (const cat of this.CAT_ORDEN) {
      if (map.has(cat)) result.push({ categoria: cat, emoji: this.CAT_EMOJIS[cat] ?? '✂️', items: map.get(cat)! });
    }
    for (const [cat, items] of map.entries()) {
      if (!this.CAT_ORDEN.includes(cat)) result.push({ categoria: cat, emoji: '✂️', items });
    }
    return result;
  }

  eliminarTurno(id: number) {
    if (!confirm('¿Eliminar esta reserva? Esta acción no se puede deshacer.')) return;
    this.negocio.eliminarTurno(id).subscribe({
      next: () => { this.turnos = this.turnos.filter(t => t.id !== id); this.cdr.detectChanges(); },
      error: () => alert('Error al eliminar la reserva.')
    });
  }

  img(url: string | undefined): string {
    return this.negocio.resolveImageUrl(url);
  }

  servicioCarruselIdx = new Map<number, number>();
  servicioImagenes(s: Servicio): string[] {
    const cat = this.negocio.normalizarCategoria(s.categoria || '');
    const catImg = this.CAT_IMGS[cat] ?? '';
    const uploaded = [s.imagenUrl, s.imagenUrl2, s.imagenUrl3].filter(Boolean) as string[];
    return catImg ? [catImg, ...uploaded] : uploaded;
  }
  carruselIdx(id: number) { return this.servicioCarruselIdx.get(id) ?? 0; }
  carruselNext(id: number, max: number, e: Event) {
    e.stopPropagation();
    this.servicioCarruselIdx.set(id, (this.carruselIdx(id) + 1) % max);
  }
  carruselPrev(id: number, max: number, e: Event) {
    e.stopPropagation();
    this.servicioCarruselIdx.set(id, (this.carruselIdx(id) - 1 + max) % max);
  }

  // ── Servicios ────────────────────────────────────────────
  cargarServicios() {
    this.negocio.getServicios().subscribe({ next: s => { this.servicios = s; this.cdr.detectChanges(); } });
  }
  abrirModalNuevoServicio() {
    this.editandoServicio = false; this.servicioEditandoId = null;
    this.servicioForm = this.servicioVacio();
    this.servicioFotos = this.fotoSlotsVacios();
    this.mostrarModalServicio = true;
  }
  abrirModalEditarServicio(s: Servicio) {
    this.editandoServicio = true; this.servicioEditandoId = s.id!;
    this.servicioForm = { ...s };
    this.servicioFotos = [
      { file: null, preview: this.negocio.resolveImageUrl(s.imagenUrl), url: s.imagenUrl || '' },
      { file: null, preview: this.negocio.resolveImageUrl(s.imagenUrl2), url: s.imagenUrl2 || '' },
      { file: null, preview: this.negocio.resolveImageUrl(s.imagenUrl3), url: s.imagenUrl3 || '' },
    ];
    this.mostrarModalServicio = true;
  }
  onFotoSeleccionada(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.servicioFotos[index] = { file, preview: e.target!.result as string, url: '' };
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }
  eliminarFoto(index: number) {
    this.servicioFotos[index] = { file: null, preview: '', url: '' };
  }
  guardarServicio() {
    if (!this.servicioForm.nombre || !this.servicioForm.precio) return;
    const pendientes = this.servicioFotos
      .map((s, i) => ({ slot: s, i }))
      .filter(x => x.slot.file !== null);

    if (pendientes.length === 0) {
      this.aplicarUrlsFotos();
      return;
    }
    this.subiendoFotos = true;
    const uploads$ = pendientes.map(x =>
      this.negocio.uploadImagen(x.slot.file!).pipe(
        tap(res => { this.servicioFotos[x.i].url = res.url; })
      )
    );
    forkJoin(uploads$).subscribe({
      next: () => { this.subiendoFotos = false; this.aplicarUrlsFotos(); },
      error: () => { this.subiendoFotos = false; alert('Error al subir las imágenes. Intentá de nuevo.'); }
    });
  }
  private aplicarUrlsFotos() {
    this.servicioForm.imagenUrl = this.servicioFotos[0].url || undefined;
    this.servicioForm.imagenUrl2 = this.servicioFotos[1].url || undefined;
    this.servicioForm.imagenUrl3 = this.servicioFotos[2].url || undefined;
    const obs = this.editandoServicio
      ? this.negocio.actualizarServicio(this.servicioEditandoId!, this.servicioForm)
      : this.negocio.crearServicio(this.servicioForm);
    obs.subscribe({ next: () => { this.mostrarModalServicio = false; this.cargarServicios(); } });
  }
  eliminarServicio(id: number) {
    if (!confirm('¿Eliminar este servicio?')) return;
    this.negocio.eliminarServicio(id).subscribe({ next: () => this.cargarServicios() });
  }

  // ── Barberos ─────────────────────────────────────────────
  cargarBarberos() {
    this.negocio.getBarberos().subscribe({ next: b => { this.barberos = b; this.cdr.detectChanges(); } });
  }
  abrirModalNuevoBarbero() {
    this.editandoBarbero = false; this.barberoEditandoId = null;
    this.barberoForm = this.barberoVacio();
    this.barberoFoto = { file: null, preview: '', url: '' };
    this.mostrarModalBarbero = true;
  }
  abrirModalEditarBarbero(b: Barbero) {
    this.editandoBarbero = true; this.barberoEditandoId = b.id!;
    this.barberoForm = { ...b };
    this.barberoFoto = { file: null, preview: this.negocio.resolveImageUrl(b.foto), url: b.foto || '' };
    this.mostrarModalBarbero = true;
  }
  onBarberoFotoSeleccionada(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.barberoFoto = { file, preview: e.target!.result as string, url: '' };
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }
  eliminarBarberoFoto() { this.barberoFoto = { file: null, preview: '', url: '' }; }
  guardarBarbero() {
    if (!this.barberoForm.nombre) return;
    if (this.barberoFoto.file) {
      this.subiendoBarberoFoto = true;
      this.negocio.uploadImagen(this.barberoFoto.file).subscribe({
        next: res => { this.subiendoBarberoFoto = false; this.barberoFoto.url = res.url; this.persistirBarbero(); },
        error: () => { this.subiendoBarberoFoto = false; alert('Error al subir la foto.'); }
      });
    } else {
      this.barberoFoto.url = this.barberoFoto.url || this.barberoForm.foto || '';
      this.persistirBarbero();
    }
  }
  private persistirBarbero() {
    this.barberoForm.foto = this.barberoFoto.url || undefined;
    const obs = this.editandoBarbero
      ? this.negocio.actualizarBarbero(this.barberoEditandoId!, this.barberoForm)
      : this.negocio.crearBarbero(this.barberoForm);
    obs.subscribe({ next: () => { this.mostrarModalBarbero = false; this.cargarBarberos(); } });
  }
  eliminarBarbero(id: number) {
    if (!confirm('¿Eliminar este barbero?')) return;
    this.negocio.eliminarBarbero(id).subscribe({ next: () => this.cargarBarberos() });
  }
  verHorarios(b: Barbero) {
    this.barberoHorariosId = b.id!;
    this.negocio.getHorarios(b.id!).subscribe({ next: h => { this.horariosActivos = h; this.cdr.detectChanges(); } });
  }
  cerrarHorarios() { this.barberoHorariosId = null; this.horariosActivos = []; }
  horarioDelDia(dia: number): HorarioBarbero | undefined {
    return this.horariosActivos.find(h => h.diaSemana === dia);
  }
  guardarHorarioDia(dia: number, inicio: string, fin: string) {
    if (!this.barberoHorariosId || !inicio || !fin) return;
    this.negocio.guardarHorario(this.barberoHorariosId, { diaSemana: dia, horaInicio: inicio, horaFin: fin }).subscribe({
      next: () => this.negocio.getHorarios(this.barberoHorariosId!).subscribe({
        next: h => { this.horariosActivos = h; this.cdr.detectChanges(); }
      })
    });
  }
  eliminarHorarioDia(dia: number) {
    if (!this.barberoHorariosId) return;
    this.negocio.eliminarHorario(this.barberoHorariosId, dia).subscribe({
      next: () => { this.horariosActivos = this.horariosActivos.filter(h => h.diaSemana !== dia); this.cdr.detectChanges(); }
    });
  }

  // ── Bloqueos ─────────────────────────────────────────────
  cargarBloqueos() {
    this.negocio.getBloqueos().subscribe({ next: b => { this.bloqueos = b; this.cdr.detectChanges(); } });
  }
  abrirModalBloqueo() { this.bloqueoForm = this.bloqueoVacio(); this.mostrarModalBloqueo = true; }
  guardarBloqueo() {
    if (!this.bloqueoForm.barberoId || !this.bloqueoForm.fecha) return;
    this.negocio.crearBloqueo(this.bloqueoForm).subscribe({
      next: () => { this.mostrarModalBloqueo = false; this.cargarBloqueos(); }
    });
  }
  eliminarBloqueo(id: number) {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    this.negocio.eliminarBloqueo(id).subscribe({ next: () => this.cargarBloqueos() });
  }

  // ── Galería ──────────────────────────────────────────────
  cargarGaleria() {
    this.negocio.getGaleria().subscribe({ next: g => { this.galeria = g; this.cdr.detectChanges(); } });
  }
  abrirModalNuevaGaleria() {
    this.editandoGaleria = false; this.galeriaEditandoId = null;
    this.galeriaForm = this.galeriaVacia();
    this.galeriaFoto = { file: null, preview: '', url: '' };
    this.mostrarModalGaleria = true;
  }
  abrirModalEditarGaleria(g: Galeria) {
    this.editandoGaleria = true; this.galeriaEditandoId = g.id!;
    this.galeriaForm = { ...g };
    this.galeriaFoto = { file: null, preview: this.negocio.resolveImageUrl(g.imagenUrl), url: g.imagenUrl || '' };
    this.mostrarModalGaleria = true;
  }
  onGaleriaFotoSeleccionada(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.galeriaFoto = { file, preview: e.target!.result as string, url: '' };
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }
  eliminarGaleriaFoto() { this.galeriaFoto = { file: null, preview: '', url: '' }; }
  guardarGaleria() {
    if (!this.galeriaForm.titulo) return;
    if (this.galeriaFoto.file) {
      this.subiendoGaleriaFoto = true;
      this.negocio.uploadImagen(this.galeriaFoto.file).subscribe({
        next: res => { this.subiendoGaleriaFoto = false; this.galeriaFoto.url = res.url; this.persistirGaleria(); },
        error: () => { this.subiendoGaleriaFoto = false; alert('Error al subir la imagen.'); }
      });
    } else {
      this.galeriaFoto.url = this.galeriaFoto.url || this.galeriaForm.imagenUrl || '';
      this.persistirGaleria();
    }
  }
  private persistirGaleria() {
    this.galeriaForm.imagenUrl = this.galeriaFoto.url || '';
    const obs = this.editandoGaleria
      ? this.negocio.actualizarGaleria(this.galeriaEditandoId!, this.galeriaForm)
      : this.negocio.crearGaleria(this.galeriaForm);
    obs.subscribe({ next: () => { this.mostrarModalGaleria = false; this.cargarGaleria(); } });
  }
  eliminarGaleria(id: number) {
    if (!confirm('¿Ocultar esta imagen?')) return;
    this.negocio.eliminarGaleria(id).subscribe({ next: () => this.cargarGaleria() });
  }

  // ── Configuración agente ─────────────────────────────────────────
  cargarContextoAgente() {
    this.cargandoContexto = true;
    this.negocio.getNegocio().subscribe({
      next: n => {
        this.agenteContexto = n.contexto;
        this.agenteContextoOriginal = n.contexto;
        this.cargandoContexto = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoContexto = false; }
    });
  }
  guardarContextoAgente() {
    if (!this.agenteContexto.trim()) return;
    this.guardandoContexto = true;
    this.negocio.updateContexto(this.agenteContexto).subscribe({
      next: () => {
        this.agenteContextoOriginal = this.agenteContexto;
        this.guardandoContexto = false;
        this.cdr.detectChanges();
      },
      error: () => { this.guardandoContexto = false; alert('Error al guardar el prompt.'); }
    });
  }
  get agenteContextoCambiado(): boolean {
    return this.agenteContexto !== this.agenteContextoOriginal;
  }

  // ── Exportar CSV ────────────────────────────────────────────────

  exportarCSV() {
    const fecha = this.fechaFiltro || 'todos';
    const cabecera = 'Fecha,Hora,Fin,Cliente,Telefono,Servicio,Barbero,Estado';
    const filas = this.turnos.map(t =>
      [t.fecha, t.hora, t.horaFin || '', t.paciente,
       t.telefono || '', t.servicio || '',
       this.nombreBarbero(t.barberoId), t.estado || ''].join(',')
    );
    const csv = [cabecera, ...filas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas-${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Nueva reserva manual ────────────────────────────────────────

  abrirModalReserva() {
    this.reservaManualForm = this.reservaManualVacia();
    this.slotsReservaManual = [];
    this.errorReservaManual = '';
    this.turnoConfirmado = null;
    this.mostrarModalReserva = true;
  }

  cerrarModalReserva() {
    this.mostrarModalReserva = false;
    this.turnoConfirmado = null;
  }

  get whatsappConfirmacion(): string {
    const t = this.turnoConfirmado;
    if (!t || !t.telefono) return '';
    const tel = t.telefono.replace(/\D/g, '');
    const msg = `Hola ${t.paciente}! Tu turno en El Corte está confirmado para el ${t.fecha} a las ${t.hora} con ${t.barberoNombre}. ¡Te esperamos!`;
    return `https://wa.me/598${tel}?text=${encodeURIComponent(msg)}`;
  }

  onCambioSlotManual() {
    this.slotsReservaManual = [];
    this.reservaManualForm.hora = '';
    const { fecha, servicio, barberoId } = this.reservaManualForm;
    if (!fecha || !servicio) return;
    this.cargandoSlotsManual = true;
    const bid = barberoId ? +barberoId : undefined;
    this.negocio.getDisponibilidad(fecha, servicio, bid).subscribe({
      next: s => { this.slotsReservaManual = s; this.cargandoSlotsManual = false; this.cdr.detectChanges(); },
      error: () => { this.cargandoSlotsManual = false; }
    });
  }

  confirmarReservaManual() {
    const f = this.reservaManualForm;
    if (!f.paciente || !f.fecha || !f.hora || !f.servicio) {
      this.errorReservaManual = 'Nombre, servicio, fecha y hora son obligatorios.';
      return;
    }
    this.enviandoReservaManual = true;
    this.errorReservaManual = '';
    const turno: Turno = {
      paciente: f.paciente,
      telefono: f.telefono,
      servicio: f.servicio,
      fecha: f.fecha,
      hora: f.hora,
      barberoId: f.barberoId ? +f.barberoId : undefined
    };
    const slotElegido = this.slotsReservaManual.find(s => s.hora === f.hora && String(s.barberoId) === String(f.barberoId));
    console.log('[Admin] crearTurno (manual):', turno);
    this.negocio.crearTurno(turno).subscribe({
      next: (resp) => {
        console.log('[Admin] crearTurno OK:', resp);
        this.enviandoReservaManual = false;
        this.turnoConfirmado = {
          paciente: f.paciente,
          telefono: f.telefono || '',
          fecha: f.fecha,
          hora: f.hora,
          barberoNombre: slotElegido?.barberoNombre || this.nombreBarbero(f.barberoId ? +f.barberoId : undefined)
        };
        this.cargarTurnos();
        this.cdr.detectChanges();
      },
      error: err => {
        this.enviandoReservaManual = false;
        this.errorReservaManual = err.status === 409
          ? 'Ese horario ya fue tomado. Elegí otro.'
          : 'Error al crear la reserva. Intentá de nuevo.';
        if (err.status === 409) this.onCambioSlotManual();
        this.cdr.detectChanges();
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  private servicioVacio(): Servicio {
    return { nombre: '', descripcion: '', precio: 0, duracionMinutos: 30, emoji: '✂️', categoria: '' };
  }
  private fotoSlotsVacios(): FotoSlot[] {
    return [
      { file: null, preview: '', url: '' },
      { file: null, preview: '', url: '' },
      { file: null, preview: '', url: '' },
    ];
  }
  private barberoVacio(): Barbero {
    return { nombre: '', especialidad: '', activo: true };
  }
  private bloqueoVacio(): BloqueoHorario {
    return { barberoId: 0, fecha: '', horaInicio: '09:00', horaFin: '10:00', motivo: '' };
  }
  private galeriaVacia(): Galeria {
    return { titulo: '', imagenUrl: '', categoria: '', activo: true };
  }
  private reservaManualVacia() {
    return { paciente: '', telefono: '', servicio: '', fecha: '', hora: '', barberoId: '' };
  }
}
