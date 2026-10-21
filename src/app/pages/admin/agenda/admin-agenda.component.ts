import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { Barbero, BloqueoHorario, NegocioService, Servicio, Turno } from '../../../negocio.service';
import { distribuirAgenda, fechaAgenda, minutosAgenda, parseFechaAgenda, semanaAgenda } from './agenda-layout';

interface EventoAgenda {
  clave: string;
  fecha: string;
  inicio: number;
  fin: number;
  titulo: string;
  subtitulo: string;
  horario: string;
  barberoId?: number;
  estado: string;
  estimado: boolean;
  turno?: Turno;
}

@Component({
  selector: 'app-admin-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-agenda.component.html',
  styleUrl: './admin-agenda.component.css'
})
export class AdminAgendaComponent implements OnChanges, OnDestroy {
  @Input() barberos: Barbero[] = [];
  @Input() servicios: Servicio[] = [];
  @Input() revision = 0;
  @Output() seleccionar = new EventEmitter<Turno>();
  @Output() nueva = new EventEmitter<{ fecha: string; barberoId: string }>();
  fecha = fechaAgenda(new Date());
  filtroBarbero = '';
  vista: 'semana' | 'dia' = 'semana';
  dias = semanaAgenda(this.fecha);
  cargando = false;
  error = '';
  eventos: EventoAgenda[] = [];
  columnas: { fecha: string; eventos: ReturnType<typeof distribuirAgenda<EventoAgenda>> }[] = [];
  eventosDia: EventoAgenda[] = [];
  horas: number[] = [];
  inicio = 8 * 60;
  fin = 20 * 60;
  private turnos: Turno[] = [];
  private bloqueos: BloqueoHorario[] = [];
  private solicitud?: Subscription;
  private iniciado = false;

  constructor(private negocio: NegocioService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: import('@angular/core').SimpleChanges) {
    if (!this.iniciado || changes['revision']) {
      this.iniciado = true;
      this.cargar();
    } else this.organizar();
  }

  ngOnDestroy() { this.solicitud?.unsubscribe(); }

  cargar() {
    this.solicitud?.unsubscribe();
    this.cargando = true;
    this.error = '';
    this.dias = semanaAgenda(this.fecha);
    this.solicitud = forkJoin({
      turnos: forkJoin(this.dias.map(fecha => this.negocio.getTurnos(fecha))),
      bloqueos: this.negocio.getBloqueos()
    }).subscribe({
      next: datos => {
        this.turnos = datos.turnos.flat();
        this.bloqueos = datos.bloqueos;
        this.organizar();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.error = 'No pudimos cargar la agenda completa. Reintentá para ver reservas y bloqueos actualizados.';
        this.cdr.detectChanges();
      }
    });
  }

  cambiarFecha(fecha: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
    if (fechaAgenda(parseFechaAgenda(fecha)) !== fecha) return;
    const anterior = this.dias[0];
    this.fecha = fecha;
    this.dias = semanaAgenda(fecha);
    if (anterior !== this.dias[0]) this.cargar();
    else this.organizar();
  }

  mover(direccion: number) {
    const fecha = parseFechaAgenda(this.fecha);
    const paso = this.vista === 'dia' || window.matchMedia('(max-width: 768px)').matches ? 1 : 7;
    fecha.setDate(fecha.getDate() + direccion * paso);
    this.cambiarFecha(fechaAgenda(fecha));
  }

  hoy() { this.cambiarFecha(fechaAgenda(new Date())); }
  esHoy(fecha: string) { return fecha === fechaAgenda(new Date()); }
  nombreBarbero(id?: number) { return this.barberos.find(b => b.id === id)?.nombre || (id ? `Barbero #${id}` : 'Sin asignar'); }
  hora(minutos: number) { return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`; }

  exportarCSV() {
    const safe = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const cabecera = 'Fecha,Hora,Fin,Cliente,Telefono,Servicio,Barbero,Estado';
    const filas = this.eventos
      .filter(e => e.turno)
      .map(e => {
        const t = e.turno!;
        return [t.fecha, t.hora, t.horaFin || '', t.paciente, t.telefono || '',
                t.servicio || '', this.nombreBarbero(e.barberoId), e.estado]
          .map(safe).join(',');
      });
    const csv = [cabecera, ...filas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-${this.dias[0]}-al-${this.dias[6]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  organizar() {
    const reservas: EventoAgenda[] = this.turnos.map(t => {
      const inicio = minutosAgenda(t.hora);
      const duracion = this.servicios.find(s => s.nombre === t.servicio)?.duracionMinutos || 30;
      const finReal = t.horaFin ? minutosAgenda(t.horaFin) : 0;
      const estimado = finReal <= inicio;
      const fin = Math.min(1440, estimado ? inicio + Math.max(1, duracion) : finReal);
      return { clave: `turno-${t.id}`, fecha: t.fecha, inicio, fin, titulo: t.paciente,
        subtitulo: t.servicio || 'Reserva', horario: `${t.hora.slice(0,5)} – ${this.hora(fin)}`,
        barberoId: t.barberoId, estado: t.estado || 'RESERVADO', estimado, turno: t };
    });
    const bloqueos: EventoAgenda[] = this.bloqueos.map(b => ({
      clave: `bloqueo-${b.id}`, fecha: b.fecha, inicio: minutosAgenda(b.horaInicio),
      fin: minutosAgenda(b.horaFin), titulo: b.motivo || 'Horario bloqueado', subtitulo: 'Bloqueo',
      horario: `${b.horaInicio.slice(0,5)} – ${b.horaFin.slice(0,5)}`, barberoId: b.barberoId,
      estado: 'BLOQUEADO', estimado: false
    }));
    this.eventos = [...reservas, ...bloqueos]
      .filter(e => this.dias.includes(e.fecha) && (!this.filtroBarbero || e.barberoId === +this.filtroBarbero))
      .sort((a,b) => a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio);
    this.inicio = Math.floor(Math.min(8 * 60, ...this.eventos.map(e => e.inicio)) / 60) * 60;
    this.fin = Math.min(1440, Math.ceil(Math.max(20 * 60, ...this.eventos.map(e => e.fin)) / 60) * 60);
    this.horas = Array.from({length: (this.fin - this.inicio) / 60}, (_,i) => this.inicio + i * 60);
    this.columnas = this.dias.map(fecha => ({fecha, eventos: distribuirAgenda(this.eventos.filter(e => e.fecha === fecha))}));
    this.eventosDia = this.eventos.filter(e => e.fecha === this.fecha);
  }
}
