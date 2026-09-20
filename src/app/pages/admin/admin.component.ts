import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NegocioService, Servicio, Turno } from '../../negocio.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  tabActiva: 'turnos' | 'servicios' = 'turnos';
  turnos: Turno[] = [];
  servicios: Servicio[] = [];
  fechaFiltro = '';

  mostrarModal = false;
  editando = false;
  servicioForm: Servicio = this.formVacio();
  servicioEditandoId: number | null = null;

  constructor(private negocio: NegocioService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarTurnos();
    this.cargarServicios();
  }

  cargarTurnos() {
    const fecha = this.fechaFiltro || undefined;
    this.negocio.getTurnos(fecha).subscribe({
      next: t => { this.turnos = t; this.cdr.detectChanges(); }
    });
  }

  limpiarFecha() {
    this.fechaFiltro = '';
    this.cargarTurnos();
  }

  cargarServicios() {
    this.negocio.getServicios().subscribe({
      next: s => { this.servicios = s; this.cdr.detectChanges(); }
    });
  }

  cambiarEstado(turno: Turno, estado: string) {
    this.negocio.actualizarEstado(turno.id!, estado).subscribe({
      next: t => { turno.estado = t.estado; this.cdr.detectChanges(); }
    });
  }

  abrirModalNuevo() {
    this.editando = false;
    this.servicioEditandoId = null;
    this.servicioForm = this.formVacio();
    this.mostrarModal = true;
  }

  abrirModalEditar(s: Servicio) {
    this.editando = true;
    this.servicioEditandoId = s.id!;
    this.servicioForm = { ...s };
    this.mostrarModal = true;
  }

  guardarServicio() {
    if (!this.servicioForm.nombre || !this.servicioForm.precio) return;
    const obs = this.editando
      ? this.negocio.actualizarServicio(this.servicioEditandoId!, this.servicioForm)
      : this.negocio.crearServicio(this.servicioForm);
    obs.subscribe({ next: () => { this.mostrarModal = false; this.cargarServicios(); } });
  }

  eliminarServicio(id: number) {
    if (!confirm('¿Eliminar este servicio?')) return;
    this.negocio.eliminarServicio(id).subscribe({ next: () => this.cargarServicios() });
  }

  private formVacio(): Servicio {
    return { nombre: '', descripcion: '', precio: 0, duracionMinutos: 30, emoji: '✂️' };
  }

  estadoBadge(estado: string): string {
    return estado === 'RESERVADO' ? 'bg-warning text-dark'
         : estado === 'COMPLETADO' ? 'bg-success'
         : 'bg-secondary';
  }
}
