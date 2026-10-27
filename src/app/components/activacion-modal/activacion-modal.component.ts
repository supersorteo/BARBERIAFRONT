import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const ADMINS = [
  { id: 'leo',    nombre: 'Uruguay',   bandera: '🇺🇾', tel: '59896909509',   moneda: 'UYU' },
  { id: 'danilo', nombre: 'Argentina', bandera: '🇦🇷', tel: '5491126911817', moneda: 'ARS' },
] as const;

type Moneda = 'UYU' | 'ARS';

interface PlanPrecioPublico { tipo: string; precioUsd: number; precioUyu: number; precioArs: number; }

const PREFIJO_TIPO: Record<string, string> = {
  '1M': 'PLAN_1M', '3M': 'PLAN_3M', '6M': 'PLAN_6M', '12M': 'PLAN_12M'
};
const LABEL_TIPO: Record<string, string> = {
  PLAN_1M: '1 mes', PLAN_3M: '3 meses', PLAN_6M: '6 meses', PLAN_12M: '12 meses'
};

const WA_MSG = encodeURIComponent('Hola, quiero solicitar un código de activación para registrar mi barbería en Corteo.');

@Component({
  selector: 'app-activacion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activacion-modal.component.html',
  styleUrl: './activacion-modal.component.css'
})
export class ActivacionModalComponent implements OnInit {
  @Output() confirmar = new EventEmitter<string>();
  @Output() cerrar    = new EventEmitter<void>();

  readonly admins = ADMINS;
  adminSeleccionado: typeof ADMINS[number] | null = null;
  codigo    = '';
  errorLocal = '';
  planPrecios: PlanPrecioPublico[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const base = environment.apiBase.replace('/api/v1', '');
    this.http.get<PlanPrecioPublico[]>(`${base}/api/plan-precios`).subscribe({
      next: p => this.planPrecios = p,
      error: () => {}
    });
  }

  get waUrl(): string {
    if (!this.adminSeleccionado) return '';
    return `whatsapp://send?phone=${this.adminSeleccionado.tel}&text=${WA_MSG}`;
  }

  get tipoCodigo(): string | null {
    const upper = this.codigo.toUpperCase().trim();
    const prefijo = upper.split('-')[0];
    return PREFIJO_TIPO[prefijo] ?? null;
  }

  get labelPlan(): string | null {
    return this.tipoCodigo ? (LABEL_TIPO[this.tipoCodigo] ?? null) : null;
  }

  get precioMostrar(): string | null {
    if (!this.tipoCodigo || !this.adminSeleccionado || this.planPrecios.length === 0) return null;
    const p = this.planPrecios.find(x => x.tipo === this.tipoCodigo);
    if (!p) return null;
    const moneda = this.adminSeleccionado.moneda as Moneda;
    const valor = moneda === 'UYU' ? p.precioUyu : p.precioArs;
    return `$ ${valor.toLocaleString('es-UY', { maximumFractionDigits: 0 })} ${moneda}`;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cerrar.emit(); }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('ac-overlay')) this.cerrar.emit();
  }

  onKey(e: KeyboardEvent): void { if (e.key === 'Enter') this.confirmarCodigo(); }

  confirmarCodigo(): void {
    const code = this.codigo.trim();
    if (!code) { this.errorLocal = 'Ingresá el código de activación para continuar.'; return; }
    this.errorLocal = '';
    this.confirmar.emit(code);
  }
}
