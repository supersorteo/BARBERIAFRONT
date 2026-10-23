import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

const SLUG_KEY = 'tenantSlug';
const NON_SLUG_SEGMENTS = new Set(['registro', 'login', 'admin', 'mi-agenda', 'superadmin', '']);

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private currentSlug = '';

  constructor() {
    try {
      this.currentSlug = sessionStorage.getItem(SLUG_KEY) ?? '';
    } catch { /* private window or storage blocked */ }
    if (!this.currentSlug) {
      this.currentSlug = this.slugFromUrl();
    }
  }

  setSlug(slug: string): void {
    this.currentSlug = slug;
    try { sessionStorage.setItem(SLUG_KEY, slug); } catch {}
  }

  resolve(authTenantId: string | undefined): string {
    if (authTenantId && authTenantId !== 'system') return authTenantId;
    return this.currentSlug || environment.defaultTenantId;
  }

  private slugFromUrl(): string {
    const first = window.location.pathname.split('/').filter(Boolean)[0] ?? '';
    return NON_SLUG_SEGMENTS.has(first) ? '' : first;
  }
}
