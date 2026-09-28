import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { barberoGuard, adminGuard } from './auth.guard';
import { AuthService } from './auth.service';

function runGuard(guard: any): boolean | any {
  return TestBed.runInInjectionContext(() => guard());
}

describe('barberoGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'isBarbero']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('allows a logged-in BARBERO user', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.isBarbero.and.returnValue(true);
    expect(runGuard(barberoGuard)).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects an authenticated ADMIN user to /admin (not /login)', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.isBarbero.and.returnValue(false);
    expect(runGuard(barberoGuard)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('blocks a non-logged-in user', () => {
    authService.isLoggedIn.and.returnValue(false);
    authService.isBarbero.and.returnValue(false);
    expect(runGuard(barberoGuard)).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
