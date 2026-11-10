import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CODIGO_PAGO_KEY, OrdenPago, PagoService } from '../../pago.service';

type Vista = 'cargando' | 'aprobado' | 'pendiente' | 'rechazado' | 'cancelado' | 'error';

const REFERENCIA = /^[0-9a-fA-F-]{36}$/;
const PAYMENT_ID = /^\d{1,20}$/;
const ORDER_ID_PAYPAL = /^[A-Za-z0-9-]{5,64}$/;
const INTERVALO_MS = 5000;
const MAX_INTENTOS = 12;

@Component({
  selector: 'app-pago-resultado',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pago-resultado.component.html',
  styleUrl: './pago-resultado.component.css'
})
export class PagoResultadoComponent implements OnInit, OnDestroy {
  vista: Vista = 'cargando';
  orden: OrdenPago | null = null;
  mensajeError = '';
  copiado = false;

  private referencia = '';
  private paymentId = '';
  private orderIdPaypal = '';
  private cancelado = false;
  private intentos = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private destruido = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pagos: PagoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.referencia = q.get('external_reference') ?? q.get('ref') ?? '';
    this.paymentId = q.get('payment_id') ?? q.get('collection_id') ?? '';

    if (!REFERENCIA.test(this.referencia)) {
      this.fallar('No encontramos los datos de tu pago. Si ya pagaste, tu suscripción se activa sola en unos minutos.');
      return;
    }
    if (!PAYMENT_ID.test(this.paymentId)) this.paymentId = '';
    this.orderIdPaypal = q.get('token') ?? '';
    if (!ORDER_ID_PAYPAL.test(this.orderIdPaypal)) this.orderIdPaypal = '';
    this.cancelado = q.get('cancelado') === '1';
    this.consultar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.temporizador) clearTimeout(this.temporizador);
  }

  reintentar(): void {
    this.intentos = 0;
    this.vista = 'cargando';
    this.cdr.detectChanges();
    this.consultar();
  }

  irARegistro(): void {
    this.router.navigate(['/registro']);
  }

  copiarCodigo(): void {
    if (!this.orden?.codigo) return;
    try {
      navigator.clipboard.writeText(this.orden.codigo).then(() => {
        this.copiado = true;
        this.cdr.detectChanges();
      }, () => {});
    } catch { /* sin soporte de portapapeles */ }
  }

  private consultar(): void {
    let peticion: Observable<OrdenPago>;
    if (!this.cancelado && this.orderIdPaypal) {
      peticion = this.pagos.capturarPayPal(this.referencia, this.orderIdPaypal);
    } else if (!this.cancelado && this.paymentId) {
      peticion = this.pagos.verificarMercadoPago(this.referencia, this.paymentId);
    } else {
      peticion = this.pagos.estadoOrden(this.referencia);
    }

    peticion.subscribe({
      next: orden => this.aplicar(orden),
      error: () => {
        if (this.orderIdPaypal || this.paymentId) {
          this.orderIdPaypal = '';
          this.paymentId = '';
          this.consultar();
          return;
        }
        this.fallar('No pudimos confirmar tu pago en este momento. Probá de nuevo en unos minutos.');
      }
    });
  }

  private aplicar(orden: OrdenPago): void {
    if (this.destruido) return;
    this.orden = orden;

    if (orden.estado === 'APROBADO') {
      if (orden.codigo) {
        try { sessionStorage.setItem(CODIGO_PAGO_KEY, orden.codigo); } catch { /* storage bloqueado */ }
      }
      this.vista = 'aprobado';
    } else if (orden.estado === 'RECHAZADO' || orden.estado === 'MONTO_INVALIDO') {
      this.vista = 'rechazado';
    } else if (this.cancelado) {
      this.vista = 'cancelado';
    } else if (this.intentos < MAX_INTENTOS) {
      this.intentos++;
      this.vista = 'cargando';
      this.temporizador = setTimeout(() => this.consultar(), INTERVALO_MS);
    } else {
      this.vista = 'pendiente';
    }
    this.cdr.detectChanges();
  }

  private fallar(mensaje: string): void {
    if (this.destruido) return;
    this.mensajeError = mensaje;
    this.vista = 'error';
    this.cdr.detectChanges();
  }
}
