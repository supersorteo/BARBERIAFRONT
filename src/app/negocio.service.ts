import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Servicio {
  id?: number;
  tenantId?: string;
  nombre: string;
  descripcion: string;
  precio: number;
  duracionMinutos: number;
  emoji: string;
  activo?: boolean;
}

export interface Turno {
  id?: number;
  tenantId?: string;
  barberoId?: number;
  paciente: string;
  telefono?: string;
  servicio?: string;
  fecha: string;
  hora: string;
  horaFin?: string;
  estado?: string;
  creadoEn?: string;
}

export interface Barbero {
  id?: number;
  tenantId?: string;
  nombre: string;
  especialidad?: string;
  foto?: string;
  activo?: boolean;
}

export interface HorarioBarbero {
  id?: number;
  barberoId?: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface BloqueoHorario {
  id?: number;
  barberoId: number;
  tenantId?: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
}

export interface Galeria {
  id?: number;
  tenantId?: string;
  titulo: string;
  descripcion?: string;
  imagenUrl: string;
  categoria?: string;
  servicioId?: number;
  activo?: boolean;
}

export interface SlotDisponible {
  hora: string;
  horaFin: string;
  barberoId: number;
  barberoNombre: string;
}

@Injectable({ providedIn: 'root' })
export class NegocioService {
  private base = environment.apiBase;
  readonly tenantId = 'barberia-demo';

  constructor(private http: HttpClient) {}

  // Servicios
  getServicios(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(`${this.base}/servicios/${this.tenantId}`);
  }
  crearServicio(s: Servicio): Observable<Servicio> {
    return this.http.post<Servicio>(`${this.base}/servicios/${this.tenantId}`, s);
  }
  actualizarServicio(id: number, s: Servicio): Observable<Servicio> {
    return this.http.put<Servicio>(`${this.base}/servicios/${this.tenantId}/${id}`, s);
  }
  eliminarServicio(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/servicios/${this.tenantId}/${id}`);
  }

  // Turnos
  getTurnos(fecha?: string): Observable<Turno[]> {
    const params = fecha ? `?fecha=${fecha}` : '';
    return this.http.get<Turno[]>(`${this.base}/turnos/${this.tenantId}${params}`);
  }
  crearTurno(t: Turno): Observable<Turno> {
    return this.http.post<Turno>(`${this.base}/turnos/${this.tenantId}`, t);
  }
  actualizarEstado(id: number, estado: string): Observable<Turno> {
    return this.http.put<Turno>(`${this.base}/turnos/${this.tenantId}/${id}/estado`, { estado });
  }

  // Barberos
  getBarberos(): Observable<Barbero[]> {
    return this.http.get<Barbero[]>(`${this.base}/barberos/${this.tenantId}`);
  }
  crearBarbero(b: Barbero): Observable<Barbero> {
    return this.http.post<Barbero>(`${this.base}/barberos/${this.tenantId}`, b);
  }
  actualizarBarbero(id: number, b: Barbero): Observable<Barbero> {
    return this.http.put<Barbero>(`${this.base}/barberos/${this.tenantId}/${id}`, b);
  }
  eliminarBarbero(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/barberos/${this.tenantId}/${id}`);
  }
  getHorarios(barberoId: number): Observable<HorarioBarbero[]> {
    return this.http.get<HorarioBarbero[]>(`${this.base}/barberos/${this.tenantId}/${barberoId}/horario`);
  }
  guardarHorario(barberoId: number, h: HorarioBarbero): Observable<HorarioBarbero> {
    return this.http.post<HorarioBarbero>(`${this.base}/barberos/${this.tenantId}/${barberoId}/horario`, h);
  }
  eliminarHorario(barberoId: number, diaSemana: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/barberos/${this.tenantId}/${barberoId}/horario/${diaSemana}`);
  }

  // Bloqueos
  getBloqueos(barberoId?: number): Observable<BloqueoHorario[]> {
    const params = barberoId ? `?barberoId=${barberoId}` : '';
    return this.http.get<BloqueoHorario[]>(`${this.base}/bloqueos/${this.tenantId}${params}`);
  }
  crearBloqueo(b: BloqueoHorario): Observable<BloqueoHorario> {
    return this.http.post<BloqueoHorario>(`${this.base}/bloqueos/${this.tenantId}`, b);
  }
  eliminarBloqueo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/bloqueos/${this.tenantId}/${id}`);
  }

  // Galería
  getGaleria(): Observable<Galeria[]> {
    return this.http.get<Galeria[]>(`${this.base}/galeria/${this.tenantId}`);
  }
  crearGaleria(g: Galeria): Observable<Galeria> {
    return this.http.post<Galeria>(`${this.base}/galeria/${this.tenantId}`, g);
  }
  actualizarGaleria(id: number, g: Galeria): Observable<Galeria> {
    return this.http.put<Galeria>(`${this.base}/galeria/${this.tenantId}/${id}`, g);
  }
  eliminarGaleria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/galeria/${this.tenantId}/${id}`);
  }

  // Disponibilidad
  getDisponibilidad(fecha: string, servicio: string, barberoId?: number): Observable<SlotDisponible[]> {
    let url = `${this.base}/disponibilidad/${this.tenantId}?fecha=${fecha}&servicio=${encodeURIComponent(servicio)}`;
    if (barberoId) url += `&barberoId=${barberoId}`;
    return this.http.get<SlotDisponible[]>(url);
  }
}
