import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NegocioService, Turno, BloqueoHorario, Barbero } from '../../negocio.service';
import { AuthService, AuthUser } from '../../auth.service';

@Component({
  selector: 'app-mi-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mi-agenda.component.html',
  styleUrl: './mi-agenda.component.css'
})
export class MiAgendaComponent implements OnInit {
  usuario: AuthUser | null = null;
  tabActiva: 'agenda' | 'horario' | 'perfil' = 'agenda';

  // Agenda
  turnos: Turno[] = [];
  fechaFiltro = new Date().toISOString().split('T')[0];
  cargando = false;

  // Perfil propio
  perfilForm: Partial<Barbero> = { especialidad: '', foto: '' };
  guardandoPerfil = false;
  mensajePerfil = '';
  exitoPerfil = false;
  // Cambio de contraseña
  cambioPassForm = { actual: '', nueva: '', confirmar: '' };
  guardandoPass = false;
  mensajePass = '';
  exitoPass = false;

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
    private router: Router
  ) {}

  ngOnInit() {
    this.usuario = this.auth.getUser();
    if (!this.usuario) { this.router.navigate(['/login']); return; }
    this.cargar();
    this.cargarBloqueos();
    this.cargarPerfil();
  }

  // ── Agenda ──────────────────────────────────────────────────────────────

  cargar() {
    this.cargando = true;
    this.negocio.getMisTurnos(this.fechaFiltro || undefined).subscribe({
      next: t => { this.turnos = t; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  limpiarFecha() { this.fechaFiltro = ''; this.cargar(); }

  cambiarEstado(t: Turno, estado: string) {
    this.negocio.actualizarEstado(t.id!, estado).subscribe({
      next: actualizado => { t.estado = actualizado.estado; }
    });
  }

  estadoBadge(estado: string) {
    if (estado === 'RESERVADO')  return 'badge bg-warning text-dark';
    if (estado === 'COMPLETADO') return 'badge bg-success';
    if (estado === 'CANCELADO')  return 'badge bg-danger';
    return 'badge bg-secondary';
  }

  // ── Bloqueos propios ────────────────────────────────────────────────────

  cargarBloqueos() {
    this.cargandoBloqueos = true;
    this.negocio.getMisBloqueos().subscribe({
      next: b => { this.bloqueos = b; this.cargandoBloqueos = false; },
      error: () => { this.cargandoBloqueos = false; }
    });
  }

  abrirFormBloqueo() {
    this.bloqueoForm = this.bloqueoVacio();
    this.errorBloqueo = '';
    this.mostrarFormBloqueo = true;
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
      next: () => { this.mostrarFormBloqueo = false; this.guardandoBloqueo = false; this.cargarBloqueos(); },
      error: () => { this.errorBloqueo = 'Error al guardar. Intentá de nuevo.'; this.guardandoBloqueo = false; }
    });
  }

  eliminarBloqueo(id: number) {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    this.negocio.eliminarMiBloqueo(id).subscribe({ next: () => this.cargarBloqueos() });
  }

  esDiaLibre(b: BloqueoHorario) {
    return b.horaInicio === '00:00' && b.horaFin === '23:59';
  }

  // ── Perfil propio ────────────────────────────────────────────────

  cargarPerfil() {
    this.negocio.getBarberos().subscribe({
      next: barberos => {
        const mio = barberos.find(b => b.id === this.usuario?.barberoId);
        if (mio) this.perfilForm = { especialidad: mio.especialidad || '', foto: mio.foto || '' };
      }
    });
  }

  guardarPerfil() {
    this.guardandoPerfil = true;
    this.mensajePerfil = '';
    this.negocio.actualizarMiPerfil(this.perfilForm).subscribe({
      next: () => {
        this.exitoPerfil = true;
        this.mensajePerfil = 'Perfil actualizado correctamente.';
        this.guardandoPerfil = false;
      },
      error: () => {
        this.exitoPerfil = false;
        this.mensajePerfil = 'Error al guardar. Intentá de nuevo.';
        this.guardandoPerfil = false;
      }
    });
  }

  guardarPassword() {
    const { actual, nueva, confirmar } = this.cambioPassForm;
    if (!actual || !nueva) { this.mensajePass = 'Completá todos los campos.'; this.exitoPass = false; return; }
    if (nueva !== confirmar) { this.mensajePass = 'Las contraseñas nuevas no coinciden.'; this.exitoPass = false; return; }
    this.guardandoPass = true;
    this.mensajePass = '';
    this.negocio.cambiarMiPassword(actual, nueva).subscribe({
      next: () => {
        this.exitoPass = true;
        this.mensajePass = 'Contraseña actualizada correctamente.';
        this.cambioPassForm = { actual: '', nueva: '', confirmar: '' };
        this.guardandoPass = false;
      },
      error: err => {
        this.exitoPass = false;
        this.mensajePass = err.error?.error || 'Contraseña actual incorrecta.';
        this.guardandoPass = false;
      }
    });
  }

  cerrarSesion() { this.auth.logout(); this.router.navigate(['/login']); }

  private bloqueoVacio(): BloqueoHorario & { diaLibre?: boolean } {
    return { barberoId: 0, fecha: '', horaInicio: '09:00', horaFin: '10:00', motivo: '', diaLibre: false };
  }
}
