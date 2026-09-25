import { Component, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';

interface Mensaje { rol: 'user' | 'bot'; texto: string; hora: string; }

const MARKER = '[ABRIR_MODAL_RESERVA]';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css'
})
export class ChatWidgetComponent {
  abierto = false;
  mensajes: Mensaje[] = [];
  inputTexto = '';
  escribiendo = false;
  tenantId = 'barberia-demo';
  sessionId = 'session-' + Date.now();

  @Output() abrirReserva = new EventEmitter<void>();

  constructor(private chatService: ChatService, private cdr: ChangeDetectorRef) {}

  toggle() {
    this.abierto = !this.abierto;
    if (this.abierto && this.mensajes.length === 0) {
      this.agregar('bot', '¡Hola! Soy el asistente de Barbería El Corte ✂️ ¿En qué te puedo ayudar?');
    }
  }

  enviar() {
    const texto = this.inputTexto.trim();
    if (!texto || this.escribiendo) return;
    this.agregar('user', texto);
    this.inputTexto = '';
    this.escribiendo = true;
    this.chatService.enviar({ tenantId: this.tenantId, sessionId: this.sessionId, mensaje: texto })
      .subscribe({
        next: (res) => {
          this.escribiendo = false;
          const tieneMarker = res.respuesta.includes(MARKER);
          const textoLimpio = res.respuesta.replace(MARKER, '').trim();
          this.agregar('bot', textoLimpio || '¡Te abro el formulario para reservar!');
          if (tieneMarker) this.abrirReserva.emit();
          this.cdr.detectChanges();
        },
        error: () => {
          this.escribiendo = false;
          this.agregar('bot', 'No pudimos contactar al asistente. Intentá de nuevo más tarde.');
          this.cdr.detectChanges();
        }
      });
  }

  onKey(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.enviar(); } }

  private agregar(rol: 'user' | 'bot', texto: string) {
    const hora = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    this.mensajes.push({ rol, texto, hora });
  }
}
