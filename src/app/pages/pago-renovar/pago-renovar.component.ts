import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PLANES, PagoService, PlanPrecioPublico, PlanTipo, Proveedor } from '../../pago.service';
import {
  NOMBRE_PROVEEDOR, OpcionPlan, PAISES, PaisConfig,
  formatoPrecio, opcionesDePlan, precioProveedor, proveedoresDisponibles
} from '../../pagos-opciones';

const SLUG_VALIDO = /^[a-z0-9][a-z0-9-]{0,59}$/;
const TIPOS_PLAN: PlanTipo[] = PLANES.map(p => p.tipo);

@Component({
  selector: 'app-pago-renovar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pago-renovar.component.html',
  styleUrl: './pago-renovar.component.css'
})
export class PagoRenovarComponent implements OnInit {
  readonly paises = PAISES;
  readonly nombreProveedor = NOMBRE_PROVEEDOR;
  readonly dominio = window.location.host;
  pais: PaisConfig = PAISES[0];
  slug = '';
  plan: PlanTipo = 'PLAN_1M';
  precios: PlanPrecioPublico[] = [];
  pagando = false;
  proveedorActivo: Proveedor | null = null;
  error = '';

  constructor(private pagos: PagoService, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.slug = (this.route.snapshot.queryParamMap.get('slug') ?? '').trim().toLowerCase().slice(0, 60);
    this.pagos.getPlanPrecios().subscribe({
      next: p => { this.precios = p; this.ajustarPlan(); this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  get opcionesPlan(): OpcionPlan[] {
    return opcionesDePlan(this.precios, TIPOS_PLAN, this.pais);
  }

  get planSeleccionado(): PlanPrecioPublico | undefined {
    return this.precios.find(p => p.tipo === this.plan);
  }

  get proveedores(): Proveedor[] {
    return proveedoresDisponibles(this.pais, this.planSeleccionado);
  }

  get mercadoPagoNoDisponible(): boolean {
    return !this.pais.proveedoresOnline.includes('MERCADOPAGO');
  }

  precioDe(proveedor: Proveedor): string | null {
    const precio = precioProveedor(this.planSeleccionado, proveedor);
    return precio ? formatoPrecio(precio) : null;
  }

  elegirPais(pais: PaisConfig): void {
    this.pais = pais;
    this.ajustarPlan();
  }

  pagar(proveedor: Proveedor): void {
    if (this.pagando) return;
    const slug = this.slug.trim().toLowerCase();
    if (!SLUG_VALIDO.test(slug)) {
      this.error = 'Ingresá el identificador de tu barbería (el que aparece en tu dirección web).';
      return;
    }
    this.error = '';
    this.pagando = true;
    this.proveedorActivo = proveedor;
    this.pagos.iniciarPago(proveedor, this.plan, slug).subscribe({
      next: checkout => {
        try {
          this.pagos.irAlCheckout(checkout.checkoutUrl);
        } catch {
          this.fallar('No pudimos abrir el pago. Intentá de nuevo.');
        }
      },
      error: e => this.fallar(PagoService.mensajeError(e))
    });
  }

  private ajustarPlan(): void {
    const opciones = this.opcionesPlan;
    if (opciones.length > 0 && !opciones.some(o => o.tipo === this.plan)) this.plan = opciones[0].tipo;
  }

  private fallar(mensaje: string): void {
    this.error = mensaje;
    this.pagando = false;
    this.proveedorActivo = null;
    this.cdr.detectChanges();
  }
}
