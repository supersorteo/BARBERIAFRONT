import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { NegocioService } from '../../negocio.service';
import { TenantContextService } from '../../tenant-context.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  form = { username: '', password: '' };
  loading = false;
  error = '';
  showPass = false;
  tab: 'dueno' | 'barbero' = this.loadTab();
  tenantInactivo = false;

  /** Slug del tenant si se accede via /:slug/login, null si es /login genérico */
  tenantSlug: string | null = null;
  /** Nombre legible derivado del slug para mostrar en la UI */
  nombreNegocio = '';

  constructor(
    private auth: AuthService,
    private negocio: NegocioService,
    private router: Router,
    private route: ActivatedRoute,
    private tenantCtx: TenantContextService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.tenantSlug = slug;
      this.nombreNegocio = this.slugToNombre(slug);
      this.tenantCtx.setSlug(slug);
      this.negocio.getConfig().subscribe({
        error: (err) => {
          if (err?.error?.code === 'TENANT_INACTIVE') {
            this.tenantInactivo = true;
            this.cdr.detectChanges();
          }
        }
      });
    }
  }

  setTab(t: 'dueno' | 'barbero'): void {
    this.tab = t;
    try { localStorage.setItem('login_tab', t); } catch { /* safari privado */ }
  }

  submit(): void {
    if (!this.form.username || !this.form.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.username, this.form.password, this.tenantSlug ?? undefined).subscribe({
      next: (u) => {
        const dest = u.rol === 'BARBERO' ? '/mi-agenda' : '/admin';
        this.router.navigate([dest]);
      },
      error: (err) => {
        if (err?.error?.code === 'TENANT_INACTIVE') {
          this.error = 'Esta barbería está desactivada. Contactá al administrador de la plataforma.';
        } else {
          this.error = 'Usuario o contraseña incorrectos.';
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onKey(e: KeyboardEvent): void { if (e.key === 'Enter') this.submit(); }

  private loadTab(): 'dueno' | 'barbero' {
    try {
      return localStorage.getItem('login_tab') === 'barbero' ? 'barbero' : 'dueno';
    } catch { return 'dueno'; }
  }

  private slugToNombre(slug: string): string {
    return slug.split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
