import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('isBarbero() returns true when rol is BARBERO', () => {
    localStorage.setItem('agente_user', JSON.stringify({
      token: 'tok', rol: 'BARBERO', tenantId: 'test-tenant', username: 'pepe'
    }));
    expect(service.isBarbero()).toBeTrue();
  });

  it('isBarbero() returns false when rol is ADMIN', () => {
    localStorage.setItem('agente_user', JSON.stringify({
      token: 'tok', rol: 'ADMIN', tenantId: 'test-tenant', username: 'admin'
    }));
    expect(service.isBarbero()).toBeFalse();
  });

  it('isBarbero() returns false when not logged in', () => {
    expect(service.isBarbero()).toBeFalse();
  });
});
