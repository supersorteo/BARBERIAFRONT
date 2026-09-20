import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NegocioService, Servicio, Turno, Barbero, Galeria, SlotDisponible } from '../../negocio.service';
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
  barberos: Barbero[] = [];
  galeria: Galeria[] = [];

  reservaForm = { paciente: '', telefono: '', servicio: '', fecha: '', hora: '', barberoId: '' };
  slotsDisponibles: SlotDisponible[] = [];
  cargandoSlots = false;
  enviando = false;
  mensajeReserva = '';
  exito = false;

  constructor(private negocio: NegocioService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.negocio.getServicios().subscribe({ next: s => { this.servicios = s; this.cdr.detectChanges(); } });
    this.negocio.getBarberos().subscribe({ next: b => { this.barberos = b; this.cdr.detectChanges(); } });
    this.negocio.getGaleria().subscribe({ next: g => { this.galeria = g; this.cdr.detectChanges(); } });
  }

  seleccionarServicio(s: Servicio) {
    this.reservaForm.servicio = s.nombre;
    this.slotsDisponibles = [];
    document.getElementById('reservar')?.scrollIntoView({ behavior: 'smooth' });
  }

  onFechaOServicioCambia() {
    this.slotsDisponibles = [];
    this.reservaForm.hora = '';
    if (!this.reservaForm.fecha || !this.reservaForm.servicio) return;
    this.cargandoSlots = true;
    const barberoId = this.reservaForm.barberoId ? +this.reservaForm.barberoId : undefined;
    this.negocio.getDisponibilidad(this.reservaForm.fecha, this.reservaForm.servicio, barberoId).subscribe({
      next: slots => { this.slotsDisponibles = slots; this.cargandoSlots = false; this.cdr.detectChanges(); },
      error: () => { this.cargandoSlots = false; this.cdr.detectChanges(); }
    });
  }

  seleccionarSlot(slot: SlotDisponible) {
    this.reservaForm.hora = slot.hora;
    if (!this.reservaForm.barberoId) this.reservaForm.barberoId = String(slot.barberoId);
  }

  enviarReserva() {
    if (!this.reservaForm.paciente || !this.reservaForm.fecha || !this.reservaForm.hora || !this.reservaForm.servicio) return;
    this.enviando = true;
    this.mensajeReserva = '';

    const turno: Turno = {
      paciente: this.reservaForm.paciente,
      telefono: this.reservaForm.telefono,
      servicio: this.reservaForm.servicio,
      fecha: this.reservaForm.fecha,
      hora: this.reservaForm.hora,
      barberoId: this.reservaForm.barberoId ? +this.reservaForm.barberoId : undefined
    };

    this.negocio.crearTurno(turno).subscribe({
      next: t => {
        this.exito = true;
        const barbero = this.barberos.find(b => b.id === t.barberoId);
        const conBarbero = barbero ? ` con ${barbero.nombre}` : '';
        this.mensajeReserva = `✅ ¡Turno confirmado! Te esperamos el ${t.fecha} de ${t.hora} a ${t.horaFin}${conBarbero}.`;
        this.reservaForm = { paciente: '', telefono: '', servicio: '', fecha: '', hora: '', barberoId: '' };
        this.slotsDisponibles = [];
        this.enviando = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.exito = false;
        this.mensajeReserva = err.status === 409
          ? '⚠️ Ese horario ya fue tomado. Por favor elegí otro.'
          : '❌ Error al reservar. Intentá de nuevo o contactanos directamente.';
        if (err.status === 409) this.onFechaOServicioCambia();
        this.enviando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
