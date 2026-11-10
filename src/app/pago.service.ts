import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export type PlanTipo = 'PLAN_1M' | 'PLAN_3M' | 'PLAN_6M' | 'PLAN_12M';
export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'MONTO_INVALIDO';
export type Proveedor = 'MERCADOPAGO' | 'PAYPAL';

export interface CheckoutCreado { referencia: string; checkoutUrl: string; }

export interface OrdenPago {
  referencia: string;
  estado: EstadoPago;
  plan: PlanTipo;
  moneda: string;
  monto: number;
  codigo: string | null;
  tenantId: string | null;
}

export interface PlanPrecioPublico { tipo: string; precioUsd: number; precioUyu: number; precioArs: number; }

export const PLANES: { tipo: PlanTipo; label: string }[] = [
  { tipo: 'PLAN_1M',  label: '1 mes' },
  { tipo: 'PLAN_3M',  label: '3 meses' },
  { tipo: 'PLAN_6M',  label: '6 meses' },
  { tipo: 'PLAN_12M', label: '12 meses' }
];

export const CODIGO_PAGO_KEY = 'corteo.codigoPago';
export const BORRADOR_REGISTRO_KEY = 'corteo.registroBorrador';
export const ESPERANDO_CODIGO_KEY = 'corteo.esperandoCodigo';

@Injectable({ providedIn: 'root' })
export class PagoService {
  private readonly raiz = environment.apiBase.replace('/api/v1', '');
  private readonly base = this.raiz + '/api/pagos';

  constructor(private http: HttpClient) {}

  getPlanPrecios(): Observable<PlanPrecioPublico[]> {
    return this.http.get<PlanPrecioPublico[]>(`${this.raiz}/api/plan-precios`);
  }

  crearOrdenMercadoPago(plan: PlanTipo, tenantId?: string): Observable<CheckoutCreado> {
    return this.http.post<CheckoutCreado>(`${this.base}/mercadopago/orden`, { plan, tenantId: tenantId ?? null });
  }

  crearOrdenPayPal(plan: PlanTipo, tenantId?: string): Observable<CheckoutCreado> {
    return this.http.post<CheckoutCreado>(`${this.base}/paypal/orden`, { plan, tenantId: tenantId ?? null });
  }

  iniciarPago(proveedor: Proveedor, plan: PlanTipo, tenantId?: string): Observable<CheckoutCreado> {
    return proveedor === 'PAYPAL'
      ? this.crearOrdenPayPal(plan, tenantId)
      : this.crearOrdenMercadoPago(plan, tenantId);
  }

  capturarPayPal(referencia: string, orderId: string): Observable<OrdenPago> {
    return this.http.post<OrdenPago>(
      `${this.base}/paypal/orden/${encodeURIComponent(referencia)}/capturar`, null,
      { params: { orderId } });
  }

  verificarMercadoPago(referencia: string, paymentId: string): Observable<OrdenPago> {
    return this.http.post<OrdenPago>(
      `${this.base}/mercadopago/orden/${encodeURIComponent(referencia)}/verificar`, null,
      { params: { paymentId } });
  }

  estadoOrden(referencia: string): Observable<OrdenPago> {
    return this.http.get<OrdenPago>(`${this.base}/orden/${encodeURIComponent(referencia)}`);
  }

  irAlCheckout(url: string): void {
    if (!/^https:\/\//i.test(url)) throw new Error('URL de pago inválida');
    window.location.assign(url);
  }

  static mensajeError(e: any, porDefecto = 'No pudimos iniciar el pago. Intentá de nuevo en unos minutos.'): string {
    if (e?.status === 429) return 'Demasiados intentos. Esperá un minuto y volvé a probar.';
    if (e?.status === 503) return 'El pago online no está disponible en este momento.';
    return e?.error?.error ?? porDefecto;
  }

  static formatoUsd(valor: number): string {
    return `US$ ${valor.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  static formatoArs(valor: number): string {
    return `$ ${valor.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS`;
  }
}
