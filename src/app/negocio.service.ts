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
  paciente: string;
  telefono?: string;
  servicio?: string;
  fecha: string;
  hora: string;
  estado?: string;
  creadoEn?: string;
}

@Injectable({ providedIn: 'root' })
export class NegocioService {
  private base = environment.apiBase;
  readonly tenantId = 'barberia-demo';

  constructor(private http: HttpClient) {}

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
}
