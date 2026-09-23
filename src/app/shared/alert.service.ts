import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions } from 'sweetalert2';

export interface ConfirmDangerOptions {
  title: string;
  html: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({ providedIn: 'root' })
export class AlertService {

  confirm(opts: ConfirmDangerOptions): Promise<boolean> {
    return Swal.fire({
      title: opts.title,
      html: opts.html,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: opts.confirmText ?? 'Confirmar',
      cancelButtonText: opts.cancelText ?? 'Cancelar',
      confirmButtonColor: '#c0392b',
      cancelButtonColor: '#555',
      background: 'var(--bg-card, #1a1a1a)',
      color: 'var(--text-primary, #f0e6c8)',
      customClass: {
        popup: 'swal-admin-popup',
        title: 'swal-admin-title',
        htmlContainer: 'swal-admin-html',
        confirmButton: 'swal-admin-confirm',
        cancelButton: 'swal-admin-cancel',
      },
      reverseButtons: true,
    }).then(r => r.isConfirmed);
  }

  success(title: string, text?: string): Promise<void> {
    return Swal.fire({
      title,
      text,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      background: 'var(--bg-card, #1a1a1a)',
      color: 'var(--text-primary, #f0e6c8)',
      customClass: { popup: 'swal-admin-popup' },
    }).then(() => undefined);
  }

  error(title: string, text?: string): Promise<void> {
    return Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#c9a03a',
      background: 'var(--bg-card, #1a1a1a)',
      color: 'var(--text-primary, #f0e6c8)',
      customClass: { popup: 'swal-admin-popup', confirmButton: 'swal-admin-confirm-gold' },
    }).then(() => undefined);
  }

  loading(title: string): void {
    Swal.fire({
      title,
      allowOutsideClick: false,
      showConfirmButton: false,
      background: 'var(--bg-card, #1a1a1a)',
      color: 'var(--text-primary, #f0e6c8)',
      customClass: { popup: 'swal-admin-popup' },
      didOpen: () => Swal.showLoading(),
    });
  }

  close(): void {
    Swal.close();
  }
}
