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

  iniciarTour(onFinish?: () => void, setTab?: (tab: string) => void): void {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Atrás',
      doneBtnText: '¡Entendido!',
      progressText: '{{current}} de {{total}}',
      stagePadding: 8,
      stageRadius: 10,
      allowClose: false,
      onDestroyed: () => {
        this.marcarTourVisto().subscribe();
        onFinish?.();
      },
      steps: [
        {
          popover: {
            title: '👋 ¡Bienvenido a tu panel!',
            description: `
              <p>Este es el lugar desde donde vas a manejar todo tu negocio: los turnos, tu equipo, los servicios que ofrecés y el aspecto de tu página.</p>
              <p>En un momento te mostramos cada sección para que sepas bien para qué sirve cada una y cómo usarla.</p>
              <p>Tocá <strong>Siguiente →</strong> para arrancar.</p>
            `,
          },
        },
        {
          element: '#admin-tab-config',
          popover: {
            title: '⚙️ Configuración — Empezá por acá',
            description: `
              <p>Antes de cualquier otra cosa, completá la configuración de tu barbería. Tocá este botón para abrir el formulario — tiene <strong>5 partes</strong>, avanzás con los botones de abajo y guardás todo al final.</p>
              <p style="margin:10px 0 5px"><span style="color:#c9a03a;font-weight:700">1 · Tu barbería</span></p>
              <p><strong>Nombre del negocio</strong> — se muestra en todo tu sitio. <strong>Frase del encabezado</strong> — una frase corta que aparece sobre el título de tu página (ej: "Barbería Premium · Montevideo"). <strong>Título de tu página</strong> — el texto grande que lo primero que ven tus clientes al entrar, en dos líneas: una en blanco y otra en dorado. <strong>Texto de bienvenida</strong> — una descripción corta de lo que hacés. <strong>Texto del pie de página</strong> — una frase sobre tu negocio que aparece al final de tu sitio.</p>
              <p style="margin:10px 0 5px"><span style="color:#c9a03a;font-weight:700">2 · Contacto & Redes</span></p>
              <p><strong>País</strong> — elegí dónde está tu barbería (esto ajusta la moneda y el código de WhatsApp automáticamente). <strong>Dirección</strong> — la dirección de tu local. <strong>Email</strong> — para que los clientes te escriban. <strong>WhatsApp</strong> — el número que aparece en tu sitio para que te contacten directo. <strong>Instagram</strong> — tu usuario de Instagram (solo el nombre, sin @). Todos estos datos se muestran al final de tu sitio.</p>
              <p style="margin:10px 0 5px"><span style="color:#c9a03a;font-weight:700">3 · Horarios de atención</span></p>
              <p>Escribí tus días y horarios en 3 líneas, como te quede más cómodo. Por ejemplo: "Martes a Sábado: 9 a 20 hs", "Domingos: 10 a 15 hs", "Lunes: Cerrado". Tus clientes lo ven en la parte de abajo de tu sitio.</p>
              <p style="margin:10px 0 5px"><span style="color:#c9a03a;font-weight:700">4 · Reseñas de clientes</span></p>
              <p>Cargá 3 opiniones de clientes para que los nuevos que visiten tu página vean que otros ya confían en vos. Podés poner reales o inventar algunas para arrancar. Por cada una completás el nombre del cliente, sus iniciales (para mostrar en su foto), el servicio que se hizo y el texto de la opinión.</p>
              <p style="margin:10px 0 5px"><span style="color:#c9a03a;font-weight:700">5 · Diseño y colores</span></p>
              <p><strong>Color principal</strong> — el color de los botones y detalles de tu sitio (viene en dorado, pero podés cambiarlo). <strong>Color de fondo</strong> — el fondo general de tu página. <strong>Color de los textos</strong> — el color de los títulos y párrafos. Cualquier cambio de color lo ves en tiempo real antes de guardar. <strong>Logo</strong> — la imagen de tu negocio que aparece en la barra de arriba del sitio; tiene que tener el fondo transparente (formato PNG o SVG). <strong>Foto de portada</strong> — la imagen grande que aparece de fondo cuando alguien entra a tu página.</p>
            `,
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#admin-tab-servicios',
          popover: {
            title: '✂️ Servicios — Lo que ofrecés',
            description: `
              <p>Acá cargás todos los cortes y tratamientos que hacés. Tus clientes los ven y los eligen cuando reservan un turno online.</p>
              <p>Tu barbería ya viene con <strong>4 tipos de servicios</strong> listos para usar: ✂️ Corte, 🪒 Barba, 💈 Combo y 🎨 Coloración. Si querés cambiarlos, crear nuevos tipos o eliminar alguno, usá el botón <em>"Gestionar categorías"</em>.</p>
              <p style="margin:8px 0 4px"><strong>Para agregar un servicio:</strong></p>
              <ol style="margin:0 0 0 16px;padding:0;list-style:decimal">
                <li>Tocá <em>"+ Nuevo servicio"</em></li>
                <li>Elegí a qué tipo pertenece (Corte, Barba, etc.) y poné el nombre</li>
                <li>Escribí el precio y cuánto tiempo dura en minutos</li>
                <li>Si querés, subí hasta 3 fotos del trabajo terminado</li>
                <li>Tocá <em>"Guardar"</em></li>
              </ol>
            `,
            side: 'bottom',
            align: 'start',
          },
          onHighlightStarted: () => setTab?.('servicios'),
        },
        {
          element: '#admin-tab-barberos',
          popover: {
            title: '💈 Barberos — Tu equipo',
            description: `
              <p>Acá agregás a cada persona que trabaja en tu barbería. Los clientes los ven y eligen con quién quieren atenderse al reservar.</p>
              <p style="margin:8px 0 4px"><strong>Por cada barbero podés hacer dos cosas importantes:</strong></p>
              <ul>
                <li><strong>Configurar sus días y horarios</strong> — tocá <em>"Ver horarios"</em> y marcá en qué días y en qué franja horaria trabaja ese barbero. Así el sistema solo va a mostrar turnos disponibles cuando él realmente está.</li>
                <li><strong>Darle acceso propio</strong> — tocá <em>"Crear acceso"</em> para generarle un usuario y contraseña. Con eso el barbero puede entrar desde su teléfono en la opción <em>"Soy barbero"</em> y ver y confirmar sus propios turnos sin que vos tengas que hacer nada.</li>
              </ul>
            `,
            side: 'bottom',
            align: 'start',
          },
          onHighlightStarted: () => setTab?.('barberos'),
        },
        {
          element: '#admin-tab-turnos',
          popover: {
            title: '📋 Reservas — Tus turnos del día',
            description: `
              <p>Acá aparecen todos los turnos que tus clientes reservaron online. Podés ver los de hoy, buscar por otra fecha o ver el historial completo.</p>
              <p style="margin:8px 0 4px"><strong>Lo que podés hacer con cada turno:</strong></p>
              <ul>
                <li>Marcarlo como <strong>Completado</strong> cuando el cliente se atendió</li>
                <li>Marcarlo como <strong>Cancelado</strong> si no se va a poder atender</li>
                <li><strong>Cargar un turno a mano</strong> — si un cliente te llama o viene al local y quiere reservar, podés anotarlo vos directamente sin que él tenga que entrar al sitio</li>
                <li>Mandar un <strong>recordatorio</strong> al cliente antes de su turno para que no se olvide</li>
              </ul>
            `,
            side: 'bottom',
            align: 'start',
          },
          onHighlightStarted: () => setTab?.('turnos'),
        },
        {
          element: '#admin-tab-galeria',
          popover: {
            title: '🖼️ Galería — Mostrá tu trabajo',
            description: `
              <p>Subí fotos de tus mejores trabajos — fades, diseños de barba, cortes creativos, lo que más te represente.</p>
              <p>Esas fotos aparecen en la galería de tu página y son una de las cosas más importantes para convencer a un cliente nuevo de que reserve con vos. Alguien que entra a tu sitio por primera vez quiere ver cómo trabajás antes de sacar un turno.</p>
              <p>Cuantas más fotos de calidad subas, más confianza genera tu página.</p>
            `,
            side: 'bottom',
            align: 'start',
          },
          onHighlightStarted: () => setTab?.('galeria'),
        },
        {
          element: '#admin-tab-dashboard',
          popover: {
            title: '📊 Inicio — Resumen de tu negocio',
            description: `
              <p>Este es el primer lugar que ves cuando entrás al panel. Te muestra un resumen de cómo está yendo tu negocio según el período que elijas — hoy, los últimos 7 días, el último mes, etc.</p>
              <p style="margin:8px 0 4px"><strong>Qué vas a encontrar acá:</strong></p>
              <ul>
                <li>Cuántos turnos hubo, cuántos se completaron y cuántos se cancelaron</li>
                <li>Cuánto dinero facturaste en ese período</li>
                <li>Cuáles son los servicios que más piden tus clientes</li>
                <li>Cuáles son los barberos con más turnos</li>
                <li>El detalle completo de los turnos de hoy, hora por hora</li>
              </ul>
            `,
            side: 'bottom',
            align: 'start',
          },
          onHighlightStarted: () => setTab?.('dashboard'),
        },
        {
          popover: {
            title: '🚀 ¡Ya sabés cómo funciona todo!',
            description: `
              <p>Ahora que conocés cada sección, el siguiente paso es completar la información de tu barbería.</p>
              <p style="margin:10px 0 8px">Te recomendamos hacerlo en este orden:</p>
              <ol style="margin:0 0 10px 16px;padding:0;list-style:decimal">
                <li>Completá la <strong>Configuración</strong> con los datos de tu negocio</li>
                <li>Cargá los <strong>Servicios</strong> que ofrecés</li>
                <li>Agregá a tus <strong>Barberos</strong> y configurá sus horarios</li>
              </ol>
              <p>Si necesitás volver a ver este recorrido en cualquier momento, tocá el botón <strong>"Tour"</strong> que está en la barra de arriba.</p>
            `,
          },
        },
      ],
    });

    driverObj.drive();
  }
}
