import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const ADMINS = [
  { id: 'leo',    nombre: 'Uruguay',   bandera: '🇺🇾', tel: '59896909509'   },
  { id: 'danilo', nombre: 'Argentina', bandera: '🇦🇷', tel: '5491126911817' },
] as const;

const WA_MSG = encodeURIComponent('Hola, quiero solicitar un código de activación para registrar mi barbería en Corteo.');

@Component({
  selector: 'app-activacion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activacion-modal.component.html',
  styleUrl: './activacion-modal.component.css'
})
export class ActivacionModalComponent {
  @Output() confirmar = new EventEmitter<string>();
  @Output() cerrar    = new EventEmitter<void>();

  readonly admins = ADMINS;
  adminSeleccionado: typeof ADMINS[number] | null = null;
  codigo    = '';
  errorLocal = '';

  get waUrl(): string {
    if (!this.adminSeleccionado) return '';
    return `whatsapp://send?phone=${this.adminSeleccionado.tel}&text=${WA_MSG}`;
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
