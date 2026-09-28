import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs';
import { environment } from '../environments/environment';

const API     = environment.apiBase.replace('/api/v1', '/api/auth');
const API_V1  = environment.apiBase;
const TOKEN_KEY = 'agente_token';
const USER_KEY  = 'agente_user';

export interface AuthUser { token: string; rol: string; tenantId: string; username: string; barberoId?: number; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  login(username: string, password: string, tenantId?: string) {
    const body: Record<string, string> = { username, password };
    if (tenantId) body['tenantId'] = tenantId;
    return this.http.post<AuthUser>(`${API}/login`, body).pipe(
      tap(u => {
        localStorage.setItem(TOKEN_KEY, u.token);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getToken(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  isLoggedIn(): boolean { return !!this.getToken(); }
  isAdmin(): boolean { return this.getUser()?.rol === 'ADMIN'; }
  isBarbero(): boolean { return this.getUser()?.rol === 'BARBERO'; }
  isSuperAdmin(): boolean { return this.getUser()?.rol === 'SUPER_ADMIN'; }

  /** Llama al servidor para verificar que el token es válido y el tenant está activo.
   *  El interceptor global maneja el 403 TENANT_INACTIVE (logout + modal + redirect).
   *  Retorna true si ok, false en cualquier error. */
  verificarSesion(): Observable<boolean> {
    return this.http.get<{ ok: boolean }>(`${API_V1}/sesion/verificar`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}
