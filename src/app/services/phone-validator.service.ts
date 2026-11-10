import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface PhoneValidation {
  ok: boolean;
  complete: boolean;
  msg: string;
}

@Injectable({ providedIn: 'root' })
export class PhoneValidatorService {
  private countryCodes: Map<string, Set<string>> | null = null;
  private codesLoading: Promise<void> | null = null;

  constructor(private http: HttpClient) {}

  async loadCodes(): Promise<void> {
    if (this.countryCodes) return;
    if (this.codesLoading) return this.codesLoading;
    this.codesLoading = firstValueFrom(
      this.http.get<Record<string, string[]>>('/data/codigos-area.json')
    ).then(data => {
      this.countryCodes = new Map(
        Object.entries(data).map(([k, v]) => [k, new Set(v)])
      );
    });
    return this.codesLoading;
  }

  maxLength(paisCodigo: string): number {
    const map: Record<string, number> = {
      UY: 8, AR: 10, CL: 9, CO: 10, PE: 9, PY: 9, BO: 8,
    };
    return map[paisCodigo] ?? 10;
  }

  validate(localDigits: string, paisCodigo: string, touched = false): PhoneValidation {
    const digits = localDigits.replace(/\D/g, '');
    const max = this.maxLength(paisCodigo);

    if (!digits) return { ok: true, complete: false, msg: '' };
    if (digits.length > max) return { ok: false, complete: false, msg: `Máximo ${max} dígitos` };

    const codes = this.countryCodes?.get(paisCodigo) ?? null;
    return this._validateWithCodes(digits, paisCodigo, max, codes, touched);
  }

  private _validateWithCodes(
    digits: string,
    paisCodigo: string,
    max: number,
    codes: Set<string> | null,
    touched: boolean
  ): PhoneValidation {
    if (!codes) {
      if (digits.length < max) {
        const falta = max - digits.length;
        return touched
          ? { ok: true, complete: false, msg: `Falta${falta > 1 ? 'n' : ''} ${falta} dígito${falta > 1 ? 's' : ''}` }
          : { ok: true, complete: false, msg: '' };
      }
      return { ok: true, complete: true, msg: '' };
    }

    const isPrefix = (prefix: string) => [...codes].some(c => c.startsWith(prefix));
    const matchAt = (n: number) => digits.length >= n && codes.has(digits.substring(0, n));

    const anyMatch = matchAt(1) || matchAt(2) || matchAt(3) || matchAt(4);

    if (digits.length <= 4) {
      if (!anyMatch && !isPrefix(digits)) {
        return { ok: false, complete: false, msg: `Código de área no reconocido (${paisCodigo})` };
      }
      return { ok: true, complete: false, msg: '' };
    }

    if (!anyMatch) {
      return { ok: false, complete: false, msg: `Código de área inválido para ${paisCodigo}` };
    }

    if (digits.length < max) {
      const falta = max - digits.length;
      return touched
        ? { ok: true, complete: false, msg: `Falta${falta > 1 ? 'n' : ''} ${falta} dígito${falta > 1 ? 's' : ''}` }
        : { ok: true, complete: false, msg: '' };
    }
    return { ok: true, complete: true, msg: '' };
  }

  validateEmail(email: string): string | null {
    if (!email) return null;
    const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return re.test(email.trim()) ? null : 'Formato de email inválido';
  }
}
