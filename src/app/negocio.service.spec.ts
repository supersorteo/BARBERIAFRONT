import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NegocioService } from './negocio.service';

describe('NegocioService.tenantId', () => {
  let service: NegocioService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(NegocioService);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('returns environment.defaultTenantId when no user is logged in', () => {
    expect(service.tenantId).toBe('barberia-demo');
  });

  it('returns the tenantId from the logged-in user JWT', () => {
    localStorage.setItem('agente_user', JSON.stringify({
      token: 'tok', rol: 'ADMIN', tenantId: 'otra-barberia', username: 'adm'
    }));
    expect(service.tenantId).toBe('otra-barberia');
  });

  it('falls back to defaultTenantId when localStorage has malformed JSON', () => {
    localStorage.setItem('agente_user', '{broken-json}');
    expect(service.tenantId).toBe('barberia-demo');
  });
});
