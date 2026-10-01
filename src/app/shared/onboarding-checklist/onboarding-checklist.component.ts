import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingStatus } from '../../onboarding.service';

@Component({
  selector: 'app-onboarding-checklist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding-checklist.component.html',
  styleUrl: './onboarding-checklist.component.css',
})
export class OnboardingChecklistComponent {
  @Input() status!: OnboardingStatus;
  @Output() navigateTo = new EventEmitter<string>();
  @Output() relanzarTour = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  get pasos() {
    return [
      {
        label: 'Configurar tu barbería',
        descripcion: 'Nombre, logo, colores y datos de contacto',
        completado: this.status.configCompleta,
        tab: 'config',
        icono: '⚙️',
      },
      {
        label: 'Agregar servicios',
        descripcion: 'Los cortes y tratamientos que ofrecés',
        completado: this.status.tieneServicios,
        tab: 'servicios',
        icono: '✂️',
      },
      {
        label: 'Agregar barberos',
        descripcion: 'Tu equipo con sus horarios de atención',
        completado: this.status.tieneBarberos,
        tab: 'barberos',
        icono: '💈',
      },
    ];
  }

  get pasosCompletados(): number {
    return this.pasos.filter(p => p.completado).length;
  }

  get todoCompleto(): boolean {
    return this.pasosCompletados === this.pasos.length;
  }
}
