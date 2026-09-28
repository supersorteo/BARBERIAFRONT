import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

const BASE = environment.apiBase.replace('/api/v1', '') + '/api/superadmin';

export interface TenantResumen { slug: string; nombre: string; activo: boolean; adminUsername: string; }
export interface Resumen { totalTenants: number; tenantActivos: number; totalAdmins: number; codigosDisponibles: number; }
export interface CodigoItem { codigo: string; usado: boolean; usadoPorUsername: string | null; usadoAt: string | null; creadoAt: string; }

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  constructor(private http: HttpClient) {}

  getResumen(): Observable<Resumen> {
    return this.http.get<Resumen>(`${BASE}/resumen`);
  }

  getTenants(): Observable<TenantResumen[]> {
    return this.http.get<TenantResumen[]>(`${BASE}/tenants`);
  }

  toggleTenant(slug: string): Observable<{ activo: boolean; slug: string }> {
    return this.http.patch<{ activo: boolean; slug: string }>(`${BASE}/tenants/${slug}/toggle`, {});
  }

  getCodigos(): Observable<CodigoItem[]> {
    return this.http.get<CodigoItem[]>(`${BASE}/codigos`);
  }

  generarCodigos(cantidad: number): Observable<{ codigo: string; creadoAt: string }[]> {
    return this.http.post<{ codigo: string; creadoAt: string }[]>(`${BASE}/codigos/generar`, { cantidad });
  }

  eliminarTenant(slug: string): Observable<{ eliminado: string }> {
    return this.http.delete<{ eliminado: string }>(`${BASE}/tenants/${slug}`);
  }
}
