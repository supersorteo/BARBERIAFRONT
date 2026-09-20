import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  NegocioService, Servicio, Turno, Barbero, HorarioBarbero, BloqueoHorario, Galeria
} from '../../negocio.service';

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  tabActiva: 'turnos' | 'servicios' | 'barberos' | 'bloqueos' | 'galeria' = 'turnos';

  // Turnos
  turnos: Turno[] = [];
  fechaFiltro = '';

  // Servicios
  servicios: Servicio[] = [];
  mostrarModalServicio = false;
  editandoServicio = false;
  servicioForm: Servicio = this.servicioVacio();
  servicioEditandoId: number | null = null;

  // Barberos
  barberos: Barbero[] = [];
  mostrarModalBarbero = false;
  editandoBarbero = false;
  barberoForm: Barbero = this.barberoVacio();
  barberoEditandoId: number | null = null;
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

  constructor(private negocio: NegocioService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarTurnos();
    this.cargarServicios();
    this.cargarBarberos();
    this.cargarBloqueos();
    this.cargarGaleria();
  }

  // ── Turnos ──────────────────────────────────────────────
  cargandoTurnos = false;
  errorTurnos = '';

  cargarTurnos() {
    this.cargandoTurnos = true;
    this.errorTurnos = '';
    const fecha = this.fechaFiltro || undefined;
    this.negocio.getTurnos(fecha).subscribe({
      next: t => { this.turnos = t; this.cargandoTurnos = false; this.cdr.detectChanges(); },
      error: e => { this.errorTurnos = 'Error cargando reservas: ' + (e.message || e.status); this.cargandoTurnos = false; this.cdr.detectChanges(); }
    });
  }
  limpiarFecha() { this.fechaFiltro = ''; this.cargarTurnos(); }
  cambiarEstado(turno: Turno, estado: string) {
    this.negocio.actualizarEstado(turno.id!, estado).subscribe({
      next: t => { turno.estado = t.estado; this.cdr.detectChanges(); }
    });
  }
  nombreBarbero(id?: number) {
    return id ? (this.barberos.find(b => b.id === id)?.nombre ?? '—') : '—';
  }
  estadoBadge(e: string) {
    return e === 'RESERVADO' ? 'bg-warning text-dark' : e === 'COMPLETADO' ? 'bg-success' : 'bg-secondary';
  }

  // ── Servicios ────────────────────────────────────────────
  cargarServicios() {
    this.negocio.getServicios().subscribe({ next: s => { this.servicios = s; this.cdr.detectChanges(); } });
  }
  abrirModalNuevoServicio() {
    this.editandoServicio = false; this.servicioEditandoId = null;
    this.servicioForm = this.servicioVacio(); this.mostrarModalServicio = true;
  }
  abrirModalEditarServicio(s: Servicio) {
    this.editandoServicio = true; this.servicioEditandoId = s.id!;
    this.servicioForm = { ...s }; this.mostrarModalServicio = true;
  }
  guardarServicio() {
    if (!this.servicioForm.nombre || !this.servicioForm.precio) return;
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
    this.barberoForm = this.barberoVacio(); this.mostrarModalBarbero = true;
  }
  abrirModalEditarBarbero(b: Barbero) {
    this.editandoBarbero = true; this.barberoEditandoId = b.id!;
    this.barberoForm = { ...b }; this.mostrarModalBarbero = true;
  }
  guardarBarbero() {
    if (!this.barberoForm.nombre) return;
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
    this.galeriaForm = this.galeriaVacia(); this.mostrarModalGaleria = true;
  }
  abrirModalEditarGaleria(g: Galeria) {
    this.editandoGaleria = true; this.galeriaEditandoId = g.id!;
    this.galeriaForm = { ...g }; this.mostrarModalGaleria = true;
  }
  guardarGaleria() {
    if (!this.galeriaForm.titulo || !this.galeriaForm.imagenUrl) return;
    const obs = this.editandoGaleria
      ? this.negocio.actualizarGaleria(this.galeriaEditandoId!, this.galeriaForm)
      : this.negocio.crearGaleria(this.galeriaForm);
    obs.subscribe({ next: () => { this.mostrarModalGaleria = false; this.cargarGaleria(); } });
  }
  eliminarGaleria(id: number) {
    if (!confirm('¿Ocultar esta imagen?')) return;
    this.negocio.eliminarGaleria(id).subscribe({ next: () => this.cargarGaleria() });
  }

  // ── Helpers ──────────────────────────────────────────────
  private servicioVacio(): Servicio {
    return { nombre: '', descripcion: '', precio: 0, duracionMinutos: 30, emoji: '✂️' };
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
}
