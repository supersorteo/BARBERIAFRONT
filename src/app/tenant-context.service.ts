import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private currentSlug = '';

  setSlug(slug: string): void {
    this.currentSlug = slug;
  }

  resolve(authTenantId: string | undefined): string {
    if (authTenantId && authTenantId !== 'system') return authTenantId;
    return this.currentSlug || environment.defaultTenantId;
  }
}
