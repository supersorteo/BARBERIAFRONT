import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../environments/environment';

const API = environment.apiBase.replace('/api/v1', '/api/auth');
const TOKEN_KEY = 'agente_token';
const USER_KEY  = 'agente_user';

export interface AuthUser { token: string; rol: string; tenantId: string; username: string; barberoId?: number; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  login(username: string, password: string) {
    return this.http.post<AuthUser>(`${API}/login`, { username, password }).pipe(
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
}
