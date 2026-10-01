import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';
import { TenantContextService } from './tenant-context.service';
import { driver } from 'driver.js';

export interface OnboardingStatus {
  tourVisto: boolean;
  configCompleta: boolean;
  tieneServicios: boolean;
  tieneBarberos: boolean;
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private base = environment.apiBase;

  get tenantId(): string {
    return this.tenantCtx.resolve(this.auth.getUser()?.tenantId);
  }

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private tenantCtx: TenantContextService
  ) {}

  getStatus(): Observable<OnboardingStatus> {
    return this.http.get<OnboardingStatus>(`${this.base}/onboarding/${this.tenantId}`);
  }

  marcarTourVisto(): Observable<void> {
    return this.http.post<void>(`${this.base}/onboarding/${this.tenantId}/tour-visto`, {});
  }

  iniciarTour(onFinish?: () => void): void {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Listo!',
      progressText: '{{current}} de {{total}}',
      onDestroyed: () => {
        this.marcarTourVisto().subscribe();
        onFinish?.();
      },
      steps: [
        {
          popover: {
            title: '👋 Bienvenido a tu panel',
            description: 'Te guiamos en 2 minutos para que conozcas cada sección y puedas empezar a recibir reservas.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#admin-tab-dashboard',
          popover: {
            title: 'Dashboard',
            description: 'Aquí ves el resumen del día: turnos pendientes, completados y estadísticas del período.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#admin-tab-turnos',
          popover: {
            title: 'Reservas',
            description: 'Gestioná todos los turnos agendados por tus clientes. Podés confirmar, completar o cancelar cada uno.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#admin-tab-servicios',
          popover: {
            title: 'Servicios',
            description: 'Cargá los cortes y tratamientos que ofrecés, con nombre, precio y duración. Tus clientes los verán al reservar.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#admin-tab-barberos',
          popover: {
            title: 'Barberos',
            description: 'Agregá a tu equipo y configurá los horarios de atención de cada uno. Cada barbero puede iniciar sesión por separado.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#admin-tab-galeria',
          popover: {
            title: 'Galería',
            description: 'Subí fotos de tus trabajos. Los clientes las ven en tu sitio público y ayudan a generar confianza.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#admin-tab-config',
          popover: {
            title: 'Configuración',
            description: 'Personalizá el nombre, logo, colores, horarios y datos de contacto de tu barbería. Esto se refleja en tu sitio público.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          popover: {
            title: '¡Estás listo para empezar!',
            description: 'En el Dashboard encontrarás el checklist de primeros pasos. Completalos para empezar a recibir clientes. Podés volver a ver este tour cuando quieras usando el botón "Tour" en la barra superior.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    });

    driverObj.drive();
  }
}
