import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

export interface ConfirmDangerOptions {
  title: string;
  html: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

const ICON_WARNING = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c9a03a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const ICON_DANGER  = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d63031" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
const ICON_SUCCESS = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4caf7d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const ICON_ERROR   = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d63031" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
const ICON_LOADING = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c9a03a" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M12 3a9 9 0 0 1 9 9"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur=".9s" repeatCount="indefinite"/></path></svg>`;

@Injectable({ providedIn: 'root' })
export class AlertService {

  confirm(opts: ConfirmDangerOptions): Promise<boolean> {
    const isDanger = opts.danger !== false;
    return Swal.fire({
      title: opts.title,
      html: opts.html,
      iconHtml: isDanger ? ICON_DANGER : ICON_WARNING,
      showCancelButton: true,
      confirmButtonText: opts.confirmText ?? 'Confirmar',
      cancelButtonText: opts.cancelText ?? 'Cancelar',
      background: '#0e0e16',
      color: '#f0e6c8',
      customClass: {
        popup: 'swal-admin-popup',
        title: 'swal-admin-title',
        htmlContainer: 'swal-admin-html',
        icon: isDanger ? 'swal-icon-custom swal-icon-danger-bg' : 'swal-icon-custom',
        confirmButton: isDanger ? 'swal-admin-confirm swal-btn-danger' : 'swal-admin-confirm',
        cancelButton: 'swal-admin-cancel',
      },
      reverseButtons: true,
    }).then(r => r.isConfirmed);
  }

  success(title: string, text?: string): Promise<void> {
    return Swal.fire({
      title,
      text,
      iconHtml: ICON_SUCCESS,
      timer: 2500,
      timerProgressBar: true,
      showConfirmButton: false,
      background: '#0e0e16',
      color: '#f0e6c8',
      customClass: {
        popup: 'swal-admin-popup',
        title: 'swal-admin-title',
        htmlContainer: 'swal-admin-html',
        icon: 'swal-icon-custom swal-icon-success-bg',
      },
    }).then(() => undefined);
  }

  error(title: string, text?: string): Promise<void> {
    return Swal.fire({
      title,
      text,
      iconHtml: ICON_ERROR,
      confirmButtonText: 'Cerrar',
      background: '#0e0e16',
      color: '#f0e6c8',
      customClass: {
        popup: 'swal-admin-popup',
        title: 'swal-admin-title',
        htmlContainer: 'swal-admin-html',
        icon: 'swal-icon-custom swal-icon-error-bg',
        confirmButton: 'swal-admin-confirm-gold',
      },
    }).then(() => undefined);
  }

  loading(title: string): void {
    Swal.fire({
      title,
      iconHtml: ICON_LOADING,
      allowOutsideClick: false,
      showConfirmButton: false,
      background: '#0e0e16',
      color: '#f0e6c8',
      customClass: {
        popup: 'swal-admin-popup',
        title: 'swal-admin-title',
        icon: 'swal-icon-custom',
      },
    });
  }

  close(): void {
    Swal.close();
  }
}
