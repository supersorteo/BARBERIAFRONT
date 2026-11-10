import { PlanPrecioPublico, PlanTipo, Proveedor } from './pago.service';

export type PaisId = 'AR' | 'UY';
export type Moneda = 'ARS' | 'UYU' | 'USD';

export interface PaisConfig {
  id: PaisId;
  nombre: string;
  bandera: string;
  monedaLocal: 'ARS' | 'UYU';
  telefonoWhatsapp: string;
  proveedoresOnline: readonly Proveedor[];
}

export interface Precio { valor: number; moneda: Moneda; }

export const PAISES: readonly PaisConfig[] = [
  {
    id: 'AR', nombre: 'Argentina', bandera: '🇦🇷', monedaLocal: 'ARS',
    telefonoWhatsapp: '5491126911817', proveedoresOnline: ['MERCADOPAGO', 'PAYPAL']
  },
  {
    id: 'UY', nombre: 'Uruguay', bandera: '🇺🇾', monedaLocal: 'UYU',
    telefonoWhatsapp: '59896909509', proveedoresOnline: ['PAYPAL']
  }
];

export const MESES_PLAN: Record<PlanTipo, number> = { PLAN_1M: 1, PLAN_3M: 3, PLAN_6M: 6, PLAN_12M: 12 };
export const PREFIJO_PLAN: Record<PlanTipo, string> = { PLAN_1M: '1M', PLAN_3M: '3M', PLAN_6M: '6M', PLAN_12M: '12M' };
export const NOMBRE_PROVEEDOR: Record<Proveedor, string> = { MERCADOPAGO: 'Mercado Pago', PAYPAL: 'PayPal' };

export function etiquetaPlan(tipo: PlanTipo): string {
  const meses = MESES_PLAN[tipo];
  return meses === 1 ? '1 mes' : `${meses} meses`;
}

export function tipoDesdeCodigo(codigo: string): PlanTipo | null {
  const prefijo = codigo.toUpperCase().trim().split('-')[0];
  const entrada = (Object.entries(PREFIJO_PLAN) as [PlanTipo, string][]).find(([, p]) => p === prefijo);
  return entrada ? entrada[0] : null;
}

function buscar(planes: PlanPrecioPublico[], tipo: PlanTipo): PlanPrecioPublico | undefined {
  return planes.find(p => p.tipo === tipo);
}

export function precioLocal(plan: PlanPrecioPublico | undefined, pais: PaisConfig): Precio | null {
  const valor = !plan ? 0 : pais.monedaLocal === 'ARS' ? plan.precioArs : plan.precioUyu;
  return valor > 0 ? { valor, moneda: pais.monedaLocal } : null;
}

export function precioProveedor(plan: PlanPrecioPublico | undefined, proveedor: Proveedor): Precio | null {
  if (!plan) return null;
  const valor = proveedor === 'MERCADOPAGO' ? plan.precioArs : plan.precioUsd;
  const moneda: Moneda = proveedor === 'MERCADOPAGO' ? 'ARS' : 'USD';
  return valor > 0 ? { valor, moneda } : null;
}

export function formatoPrecio(precio: Precio): string {
  switch (precio.moneda) {
    case 'ARS': return `$ ${precio.valor.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS`;
    case 'UYU': return `$ ${precio.valor.toLocaleString('es-UY', { maximumFractionDigits: 0 })} UYU`;
    case 'USD': return `US$ ${precio.valor.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}

export function proveedoresDisponibles(pais: PaisConfig, plan: PlanPrecioPublico | undefined): Proveedor[] {
  return pais.proveedoresOnline.filter(p => precioProveedor(plan, p) !== null);
}

export function ahorroPorcentaje(planes: PlanPrecioPublico[], tipo: PlanTipo, pais: PaisConfig): number | null {
  const meses = MESES_PLAN[tipo];
  if (meses <= 1) return null;
  const mensual = precioLocal(buscar(planes, 'PLAN_1M'), pais);
  const actual = precioLocal(buscar(planes, tipo), pais);
  if (!mensual || !actual) return null;
  const porcentaje = Math.round((1 - actual.valor / (mensual.valor * meses)) * 100);
  return porcentaje >= 1 ? porcentaje : null;
}

export interface OpcionPlan {
  tipo: PlanTipo;
  etiqueta: string;
  precio: string;
  ahorro: number | null;
}

export function opcionesDePlan(planes: PlanPrecioPublico[], tipos: PlanTipo[], pais: PaisConfig): OpcionPlan[] {
  return tipos.flatMap(tipo => {
    const precio = precioLocal(buscar(planes, tipo), pais);
    return precio
      ? [{ tipo, etiqueta: etiquetaPlan(tipo), precio: formatoPrecio(precio), ahorro: ahorroPorcentaje(planes, tipo, pais) }]
      : [];
  });
}

export function mensajeWhatsapp(pais: PaisConfig, tipo: PlanTipo, precio: Precio | null): string {
  const lineas = [
    'Hola, quiero solicitar un código de activación para registrar mi barbería en Corteo.',
    '',
    `País: ${pais.nombre}`,
    `Plan: ${etiquetaPlan(tipo)} (código ${PREFIJO_PLAN[tipo]})`
  ];
  if (precio) lineas.push(`Precio: ${formatoPrecio(precio)}`);
  return lineas.join('\n');
}

export function urlWhatsapp(pais: PaisConfig, mensaje: string): string {
  return `https://wa.me/${pais.telefonoWhatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export function resumenMetodos(pais: PaisConfig): string {
  const online = pais.proveedoresOnline.map(p => NOMBRE_PROVEEDOR[p]);
  return [...online, 'WhatsApp'].join(' · ');
}
