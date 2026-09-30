import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';
import { TenantContextService } from './tenant-context.service';

export interface Servicio {
  id?: number;
  tenantId?: string;
  nombre: string;
  descripcion: string;
  precio: number;
  duracionMinutos: number;
  emoji: string;
  categoria?: string;
  imagenUrl?: string;
  imagenUrl2?: string;
  imagenUrl3?: string;
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

export interface UsuarioAdmin {
  id: number;
  username: string;
  rol: string;
  barberoId: number;
  activo: boolean;
}

export interface UsuarioConPassword extends UsuarioAdmin {
  password: string;
}

export interface NegocioConfig {
  tenantId?: string;
  nombre: string;
  tagline: string;
  heroTitulo1: string;
  heroTitulo2: string;
  heroDesc: string;
  footerDesc: string;
  direccion: string;
  telefono: string;
  email?: string;
  whatsapp?: string;
  instagramHandle?: string;
  timeZone?: string;
  horario1?: string;
  horario2?: string;
  horario3?: string;
  t1Nombre?: string; t1Iniciales?: string; t1Servicio?: string; t1Texto?: string;
  t2Nombre?: string; t2Iniciales?: string; t2Servicio?: string; t2Texto?: string;
  t3Nombre?: string; t3Iniciales?: string; t3Servicio?: string; t3Texto?: string;
  // Personalización visual
  colorPrimario?: string;
  colorFondo?: string;
  colorTexto?: string;
  logoUrl?: string;
  heroBgUrl?: string;
  moneda?: string;
  paisCodigo?: string;
}

export interface Categoria {
  id?: number;
  tenantId?: string;
  nombre: string;
  emoji: string;
  imagenUrl?: string;
  orden: number;
  activo?: boolean;
}

export interface ClienteResumen {
  nombre: string;
  telefono: string;
  totalVisitas: number;
  ultimaVisita: string;
}

export interface DashboardHoy {
  fecha: string;
  total: number;
  reservados: number;
  completados: number;
  cancelados: number;
  ingresoEstimadoUYU: number;
  porBarbero: { barberoId: number; nombre: string; total: number; completados: number }[];
}

export interface DashboardRango {
  desde: string;
  hasta: string;
  total: number;
  completados: number;
  cancelados: number;
  reservados: number;
  ingresoEstimado: number;
  rankingBarberos: { barberoId: number; nombre: string; total: number; completados: number; ingreso: number }[];
  rankingServicios: { servicio: string; cantidad: number }[];
  serieDiaria: { fecha: string; total: number; completados: number }[];
}

@Injectable({ providedIn: 'root' })
export class NegocioService {
  private base = environment.apiBase;

  get tenantId(): string {
    return this.tenantCtx.resolve(this.auth.getUser()?.tenantId);
  }

  constructor(private http: HttpClient, private auth: AuthService, private tenantCtx: TenantContextService) {}

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

  uploadImagen(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.base}/upload/${this.tenantId}`, formData);
  }

  resolveImageUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return this.base.replace('/api/v1', '') + url;
  }

  readonly PAIS_TEL: Record<string, { prefijo: string; digitos: number; placeholder: string }> = {
    'UY': { prefijo: '598', digitos: 8,  placeholder: '91 234 567'   },
    'AR': { prefijo: '549', digitos: 10, placeholder: '11 1234 5678' },
    'CL': { prefijo: '56',  digitos: 9,  placeholder: '9 1234 5678'  },
    'CO': { prefijo: '57',  digitos: 10, placeholder: '300 123 4567' },
    'PE': { prefijo: '51',  digitos: 9,  placeholder: '987 654 321'  },
    'MX': { prefijo: '52',  digitos: 10, placeholder: '55 1234 5678' },
    'US': { prefijo: '1',   digitos: 10, placeholder: '555 234 5678' },
  };

  paisTelCfg(paisCodigo: string) {
    return this.PAIS_TEL[paisCodigo] ?? this.PAIS_TEL['UY'];
  }

  applyBackgroundColor(hex: string) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    const mix = (c: number, t: number, p: number) => clamp(c + (t - c) * p);
    const toHex = (rv: number, gv: number, bv: number) =>
      '#' + [rv, gv, bv].map(x => x.toString(16).padStart(2, '0')).join('');
    const root = document.documentElement;
    root.style.setProperty('--bg-void',    toHex(mix(r,0,.35), mix(g,0,.35), mix(b,0,.35)));
    root.style.setProperty('--bg-base',    hex);
    root.style.setProperty('--bg-surface', toHex(mix(r,255,.06), mix(g,255,.06), mix(b,255,.06)));
    root.style.setProperty('--bg-card',    toHex(mix(r,255,.12), mix(g,255,.12), mix(b,255,.12)));
    root.style.setProperty('--bg-card-2',  toHex(mix(r,255,.18), mix(g,255,.18), mix(b,255,.18)));
  }

  applyTextColor(hex: string) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const root = document.documentElement;
    root.style.setProperty('--text-primary',   hex);
    root.style.setProperty('--text-secondary', `rgba(${r},${g},${b},0.62)`);
    root.style.setProperty('--text-muted',     `rgba(${r},${g},${b},0.36)`);
  }

  applyBrandColor(hex: string) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const mix = (c: number, t: number, p: number) => Math.round(c + (t - c) * p);
    const toHex = (rv: number, gv: number, bv: number) =>
      '#' + [rv, gv, bv].map(x => x.toString(16).padStart(2, '0')).join('');
    const lR = mix(r, 255, 0.35), lG = mix(g, 255, 0.35), lB = mix(b, 255, 0.35);
    const dR = mix(r, 0, 0.40),   dG = mix(g, 0, 0.40),   dB = mix(b, 0, 0.40);
    const light = toHex(lR, lG, lB);
    const dark  = toHex(dR, dG, dB);
    const root  = document.documentElement;
    root.style.setProperty('--gold',             hex);
    root.style.setProperty('--gold-light',       light);
    root.style.setProperty('--gold-dark',        dark);
    root.style.setProperty('--gold-glow',        `rgba(${r},${g},${b},0.18)`);
    root.style.setProperty('--gold-glow-strong', `rgba(${r},${g},${b},0.35)`);
    root.style.setProperty('--border-gold',      `rgba(${r},${g},${b},0.25)`);
    root.style.setProperty('--border-gold-h',    `rgba(${r},${g},${b},0.55)`);
    root.style.setProperty('--grad-gold',        `linear-gradient(135deg,${light} 0%,${hex} 50%,${dark} 100%)`);
    root.style.setProperty('--grad-gold-h',      `linear-gradient(90deg,${light} 0%,${hex} 50%,${dark} 100%)`);
    root.style.setProperty('--color-primary',    hex);
  }

  normalizarCategoria(cat: string): string {
    const n = (cat || '').trim().toLowerCase();
    if (n.includes('barba') || n.includes('beard'))                             return 'Barba';
    if (n.includes('combo') || n.includes('completo') || n.includes('pack'))   return 'Combo';
    if (n.includes('color') || n.includes('tinte') || n.includes('mecha'))     return 'Coloración';
    return 'Corte';
  }

  eliminarTurno(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/turnos/${this.tenantId}/${id}`);
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
  reasignarTurno(id: number, barberoId: number): Observable<Turno> {
    return this.http.put<Turno>(`${this.base}/turnos/${this.tenantId}/${id}/reasignar`, { barberoId });
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
  impactoBarbero(id: number): Observable<{ nombre: string; turnos: number; tieneUsuario: boolean }> {
    return this.http.get<{ nombre: string; turnos: number; tieneUsuario: boolean }>(`${this.base}/barberos/${this.tenantId}/${id}/impacto`);
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

  // Categorías
  getCategorias(tenantId?: string): Observable<Categoria[]> {
    const tid = tenantId || this.tenantId;
    return this.http.get<Categoria[]>(`${this.base}/categorias/${tid}`);
  }
  crearCategoria(c: Categoria): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.base}/categorias/${this.tenantId}`, c);
  }
  actualizarCategoria(id: number, c: Categoria): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.base}/categorias/${this.tenantId}/${id}`, c);
  }
  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/categorias/${this.tenantId}/${id}`);
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

  // Perfil propio del barbero
  actualizarMiPerfil(datos: Partial<Barbero>): Observable<Barbero> {
    return this.http.patch<Barbero>(`${this.base}/barberos/${this.tenantId}/mi-perfil`, datos);
  }

  // Turnos del barbero autenticado (server-side filtered)
  getMisTurnos(fecha?: string): Observable<Turno[]> {
    const params = fecha ? `?fecha=${fecha}` : '';
    return this.http.get<Turno[]>(`${this.base}/turnos/${this.tenantId}/mis-turnos${params}`);
  }

  // Bloqueos del barbero autenticado
  getMisBloqueos(): Observable<BloqueoHorario[]> {
    return this.http.get<BloqueoHorario[]>(`${this.base}/bloqueos/${this.tenantId}/mios`);
  }
  crearMiBloqueo(b: Partial<BloqueoHorario>): Observable<BloqueoHorario> {
    return this.http.post<BloqueoHorario>(`${this.base}/bloqueos/${this.tenantId}/mios`, b);
  }
  eliminarMiBloqueo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/bloqueos/${this.tenantId}/mios/${id}`);
  }

  // Clientes (admin)
  getClientes(): Observable<ClienteResumen[]> {
    return this.http.get<ClienteResumen[]>(`${this.base}/clientes/${this.tenantId}`);
  }
  getHistorialCliente(nombre: string): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.base}/clientes/${this.tenantId}/${encodeURIComponent(nombre)}/historial`);
  }

  // Dashboard admin
  getDashboardHoy(): Observable<DashboardHoy> {
    return this.http.get<DashboardHoy>(`${this.base}/dashboard/${this.tenantId}/hoy`);
  }
  getDashboardRango(desde: string, hasta: string): Observable<DashboardRango> {
    return this.http.get<DashboardRango>(`${this.base}/dashboard/${this.tenantId}/rango?desde=${desde}&hasta=${hasta}`);
  }

  // Disponibilidad
  getDisponibilidad(fecha: string, servicio: string, barberoId?: number): Observable<SlotDisponible[]> {
    let url = `${this.base}/disponibilidad/${this.tenantId}?fecha=${fecha}&servicio=${encodeURIComponent(servicio)}`;
    if (barberoId) url += `&barberoId=${barberoId}`;
    return this.http.get<SlotDisponible[]>(url);
  }

  // Usuarios (admin)
  getUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.base}/admin/${this.tenantId}/usuarios`);
  }
  crearUsuarioBarbero(data: { username: string; password: string; barberoId: number }): Observable<UsuarioConPassword> {
    return this.http.post<UsuarioConPassword>(`${this.base}/admin/${this.tenantId}/usuarios`, data);
  }
  resetearPassword(userId: number, password: string): Observable<{ username: string; password: string }> {
    return this.http.patch<{ username: string; password: string }>(
      `${this.base}/admin/${this.tenantId}/usuarios/${userId}/password`, { password }
    );
  }
  eliminarUsuario(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/${this.tenantId}/usuarios/${userId}`);
  }
  cambiarMiPassword(actual: string, nueva: string): Observable<void> {
    return this.http.patch<void>(`${this.base.replace('/api/v1', '/api/auth')}/cambiar-password`, { actual, nueva });
  }

  // Config dinámica del landing
  getConfig(): Observable<NegocioConfig> {
    return this.http.get<NegocioConfig>(`${this.base}/config/${this.tenantId}`).pipe(
      tap(config => this.applyBusinessIcons(config.logoUrl))
    );
  }
  updateConfig(c: NegocioConfig): Observable<NegocioConfig> {
    return this.http.put<NegocioConfig>(`${this.base}/config/${this.tenantId}`, c).pipe(
      tap(config => this.applyBusinessIcons(config.logoUrl))
    );
  }

  private applyBusinessIcons(logoUrl?: string) {
    const customLogo = logoUrl?.trim() ? this.resolveImageUrl(logoUrl.trim()) : '';
    for (const rel of ['icon', 'apple-touch-icon']) {
      const links = document.head.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`);
      const icon = document.createElement('link');
      icon.rel = rel;
      icon.href = customLogo || (rel === 'icon' ? 'favicon.ico?v=corteo-3' : 'logos/apple-touch-icon.png');
      // Custom uploads may be PNG, JPEG, WebP or SVG: do not retain the ICO MIME type/sizes.
      if (!customLogo) {
        icon.type = rel === 'icon' ? 'image/x-icon' : 'image/png';
        if (rel === 'apple-touch-icon') icon.sizes.value = '180x180';
      }
      links.forEach(link => link.remove());
      document.head.appendChild(icon);
    }
  }

  // Configuración del negocio / agente
  getNegocio(): Observable<{ id: string; nombre: string; contexto: string }> {
    return this.http.get<{ id: string; nombre: string; contexto: string }>(`${this.base}/negocio/${this.tenantId}`);
  }
  updateContexto(contexto: string): Observable<{ id: string; nombre: string; contexto: string }> {
    return this.http.patch<{ id: string; nombre: string; contexto: string }>(
      `${this.base}/negocio/${this.tenantId}/contexto`, { contexto }
    );
  }
}
