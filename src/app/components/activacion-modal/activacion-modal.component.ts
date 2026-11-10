import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PLANES, PagoService, PlanPrecioPublico, PlanTipo, Proveedor } from '../../pago.service';
import {
  NOMBRE_PROVEEDOR, OpcionPlan, PAISES, PaisConfig,
  etiquetaPlan, formatoPrecio, mensajeWhatsapp, opcionesDePlan, precioLocal, precioProveedor,
  proveedoresDisponibles, resumenMetodos, tipoDesdeCodigo, urlWhatsapp
} from '../../pagos-opciones';

type Paso = 'pais' | 'plan' | 'pago' | 'codigo';
type EstadoPrecios = 'cargando' | 'ok' | 'error';

const TIPOS_PLAN: PlanTipo[] = PLANES.map(p => p.tipo);

@Component({
  selector: 'app-activacion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activacion-modal.component.html',
  styleUrl: './activacion-modal.component.css'
})
export class ActivacionModalComponent implements OnInit {
  @Output() confirmar = new EventEmitter<string>();
  @Output() cerrar = new EventEmitter<void>();
  @Output() antesDePagar = new EventEmitter<void>();
  @Output() solicitoPorWhatsapp = new EventEmitter<void>();
  @Input() codigoInicial = '';
  @Input() pasoInicial: 'pais' | 'codigo' = 'pais';
  @ViewChild('tituloPaso') private tituloPaso?: ElementRef<HTMLElement>;

  readonly paises = PAISES;
  readonly etapas = ['País', 'Plan', 'Pago'];
  readonly nombreProveedor = NOMBRE_PROVEEDOR;
  readonly resumenMetodos = resumenMetodos;

  paso: Paso = 'pais';
  pais: PaisConfig | null = null;
  plan: PlanTipo | null = null;
  planPrecios: PlanPrecioPublico[] = [];
  estadoPrecios: EstadoPrecios = 'cargando';
  pagoOnlineAbierto = false;
  vieneDeWhatsapp = false;
  pagando = false;
  proveedorActivo: Proveedor | null = null;
  errorPago = '';
  codigo = '';
  errorLocal = '';

  private pasoAnterior: Paso = 'pais';

  constructor(private pagos: PagoService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.codigoInicial) this.codigo = this.codigoInicial;
    if (this.pasoInicial === 'codigo') {
      this.paso = 'codigo';
      this.vieneDeWhatsapp = !this.codigoInicial;
    }
    this.cargarPrecios();
  }

  cargarPrecios(): void {
    this.estadoPrecios = 'cargando';
    this.pagos.getPlanPrecios().subscribe({
      next: precios => {
        this.planPrecios = precios;
        this.estadoPrecios = 'ok';
        this.cdr.detectChanges();
      },
      error: () => {
        this.estadoPrecios = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  get indicePaso(): number {
    return this.paso === 'pais' ? 0 : this.paso === 'plan' ? 1 : this.paso === 'pago' ? 2 : -1;
  }

  get codigoCargado(): boolean {
    return !!this.codigoInicial;
  }

  get titulo(): string {
    if (this.paso === 'codigo' && this.codigoCargado) return 'Tu código está listo';
    switch (this.paso) {
      case 'pais': return 'Elegí tu país';
      case 'plan': return 'Elegí tu plan';
      case 'pago': return '¿Cómo querés pagar?';
      case 'codigo': return 'Ingresá tu código';
    }
  }

  get subtitulo(): string {
    if (this.paso === 'codigo' && this.codigoCargado) return 'Confirmalo para crear tu barbería';
    switch (this.paso) {
      case 'pais': return 'Así te mostramos los precios y formas de pago disponibles';
      case 'plan': return 'Cuanto más largo el plan, menos pagás por mes';
      case 'pago': return 'Por WhatsApp o pagando online';
      case 'codigo': return 'El que recibiste por WhatsApp o al pagar';
    }
  }

  get opcionesPlan(): OpcionPlan[] {
    return this.pais ? opcionesDePlan(this.planPrecios, TIPOS_PLAN, this.pais) : [];
  }

  get planSeleccionado(): PlanPrecioPublico | undefined {
    return this.planPrecios.find(p => p.tipo === this.plan);
  }

  get etiquetaPlanElegido(): string {
    return this.plan ? etiquetaPlan(this.plan) : '';
  }

  get precioLocalTexto(): string | null {
    if (!this.pais) return null;
    const precio = precioLocal(this.planSeleccionado, this.pais);
    return precio ? formatoPrecio(precio) : null;
  }

  get proveedores(): Proveedor[] {
    return this.pais ? proveedoresDisponibles(this.pais, this.planSeleccionado) : [];
  }

  get mercadoPagoNoDisponible(): boolean {
    return !!this.pais && !this.pais.proveedoresOnline.includes('MERCADOPAGO');
  }

  get urlWhatsappPedido(): string {
    if (!this.pais || !this.plan) return '';
    const precio = precioLocal(this.planSeleccionado, this.pais);
    return urlWhatsapp(this.pais, mensajeWhatsapp(this.pais, this.plan, precio));
  }

  get etiquetaPlanDelCodigo(): string | null {
    const tipo = tipoDesdeCodigo(this.codigo);
    return tipo ? etiquetaPlan(tipo) : null;
  }

  precioDe(proveedor: Proveedor): string | null {
    const precio = precioProveedor(this.planSeleccionado, proveedor);
    return precio ? formatoPrecio(precio) : null;
  }

  elegirPais(pais: PaisConfig): void {
    if (this.pais?.id !== pais.id) {
      this.plan = null;
      this.pagoOnlineAbierto = false;
    }
    this.pais = pais;
  }

  elegirPlan(tipo: PlanTipo): void {
    this.plan = tipo;
    this.pagoOnlineAbierto = false;
    this.errorPago = '';
  }

  siguiente(): void {
    if (this.paso === 'pais' && this.pais) this.irA('plan');
    else if (this.paso === 'plan' && this.plan && this.precioLocalTexto) this.irA('pago');
  }

  atras(): void {
    if (this.paso === 'plan') this.irA('pais');
    else if (this.paso === 'pago') this.irA('plan');
    else if (this.paso === 'codigo') this.irA(this.pasoAnterior);
  }

  irACodigo(): void {
    this.pasoAnterior = this.paso === 'codigo' ? this.pasoAnterior : this.paso;
    this.irA('codigo');
  }

  alAbrirWhatsapp(): void {
    this.antesDePagar.emit();
    this.solicitoPorWhatsapp.emit();
    this.vieneDeWhatsapp = true;
    // El enlace abre WhatsApp en otra pestaña; se cambia de paso después de que el navegador lo procese
    setTimeout(() => this.irACodigo(), 0);
  }

  alternarPagoOnline(): void {
    this.pagoOnlineAbierto = !this.pagoOnlineAbierto;
    this.errorPago = '';
  }

  pagarOnline(proveedor: Proveedor): void {
    if (this.pagando || !this.plan) return;
    this.pagando = true;
    this.proveedorActivo = proveedor;
    this.errorPago = '';
    this.pagos.iniciarPago(proveedor, this.plan).subscribe({
      next: checkout => {
        try {
          this.antesDePagar.emit();
          this.pagos.irAlCheckout(checkout.checkoutUrl);
        } catch {
          this.fallarPago('No pudimos abrir el pago. Intentá de nuevo.');
        }
      },
      error: e => this.fallarPago(PagoService.mensajeError(e))
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cerrar.emit(); }

  onKey(e: KeyboardEvent): void { if (e.key === 'Enter') this.confirmarCodigo(); }

  confirmarCodigo(): void {
    const code = this.codigo.trim();
    if (!code) { this.errorLocal = 'Ingresá el código de activación para continuar.'; return; }
    this.errorLocal = '';
    this.confirmar.emit(code);
  }

  private irA(paso: Paso): void {
    this.paso = paso;
    this.errorLocal = '';
    this.errorPago = '';
    this.cdr.detectChanges();
    setTimeout(() => this.tituloPaso?.nativeElement.focus(), 0);
  }

  private fallarPago(mensaje: string): void {
    this.errorPago = mensaje;
    this.pagando = false;
    this.proveedorActivo = null;
    this.cdr.detectChanges();
  }
}
