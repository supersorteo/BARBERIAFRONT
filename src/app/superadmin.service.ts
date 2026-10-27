import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

const BASE = environment.apiBase.replace('/api/v1', '') + '/api/superadmin';

export interface TenantResumen { slug: string; nombre: string; activo: boolean; adminUsername: string; fechaRegistro: string | null; fechaVencimientoSuscripcion: string | null; }
export interface Resumen { totalTenants: number; tenantActivos: number; totalAdmins: number; codigosDisponibles: number; }
export type TipoCodigo = 'PLAN_1M' | 'PLAN_3M' | 'PLAN_6M' | 'PLAN_12M';
export interface CodigoItem { codigo: string; tipo: TipoCodigo | null; usado: boolean; usadoPorUsername: string | null; usadoAt: string | null; fechaVencimiento: string | null; creadoAt: string; }
export interface PlanPrecio { tipo: TipoCodigo; precioUsd: number; precioUyu: number; precioArs: number; }

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

  generarCodigos(cantidad: number, tipo: string): Observable<{ codigo: string; tipo: string; creadoAt: string }[]> {
    return this.http.post<{ codigo: string; tipo: string; creadoAt: string }[]>(`${BASE}/codigos/generar`, { cantidad, tipo });
  }

  getPlanPrecios(): Observable<PlanPrecio[]> {
    return this.http.get<PlanPrecio[]>(`${BASE}/plan-precios`);
  }

  updatePlanPrecio(tipo: TipoCodigo, precios: Partial<Pick<PlanPrecio, 'precioUsd' | 'precioUyu' | 'precioArs'>>): Observable<PlanPrecio> {
    return this.http.put<PlanPrecio>(`${BASE}/plan-precios/${tipo}`, precios);
  }

  eliminarCodigosLegacy(): Observable<{ eliminados: number }> {
    return this.http.delete<{ eliminados: number }>(`${BASE}/codigos/legacy`);
  }

  eliminarTenant(slug: string): Observable<{ eliminado: string }> {
    return this.http.delete<{ eliminado: string }>(`${BASE}/tenants/${slug}`);
  }

  resetPassword(slug: string, password?: string): Observable<{ username: string; password: string }> {
    const body = password ? { password } : {};
    return this.http.patch<{ username: string; password: string }>(`${BASE}/tenants/${slug}/reset-password`, body);
  }

  actualizarSuscripcion(slug: string, fechaInicio: string, tipoPlan: TipoCodigo): Observable<TenantResumen> {
    return this.http.patch<TenantResumen>(`${BASE}/tenants/${slug}/suscripcion`, { fechaInicio, tipoPlan });
  }
}
