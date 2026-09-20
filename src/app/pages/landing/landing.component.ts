import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NegocioService, Servicio, Turno } from '../../negocio.service';
import { ChatWidgetComponent } from '../../components/chat-widget/chat-widget.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChatWidgetComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  servicios: Servicio[] = [];
  reservaForm: Turno = { paciente: '', telefono: '', servicio: '', fecha: '', hora: '' };
  horasDisponibles = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'];
  enviando = false;
  mensajeReserva = '';
  exito = false;

  constructor(private negocio: NegocioService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.negocio.getServicios().subscribe({ next: s => { this.servicios = s; this.cdr.detectChanges(); } });
  }

  seleccionarServicio(s: Servicio) {
    this.reservaForm.servicio = s.nombre;
    document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
  }

  enviarReserva() {
    if (!this.reservaForm.paciente || !this.reservaForm.fecha || !this.reservaForm.hora) return;
    this.enviando = true;
    this.mensajeReserva = '';
    this.negocio.crearTurno(this.reservaForm).subscribe({
      next: () => {
        this.exito = true;
        this.mensajeReserva = `✅ ¡Turno confirmado! Te esperamos el ${this.reservaForm.fecha} a las ${this.reservaForm.hora}.`;
        this.reservaForm = { paciente: '', telefono: '', servicio: '', fecha: '', hora: '' };
        this.enviando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.exito = false;
        this.mensajeReserva = '❌ Error al reservar. Intentá de nuevo o contactanos directamente.';
        this.enviando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
