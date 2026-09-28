import { CanDeactivateFn } from '@angular/router';

export interface SuperAdminDeactivatable {
  allowNavigation: boolean;
}

export const superAdminDeactivateGuard: CanDeactivateFn<SuperAdminDeactivatable> = (component) => {
  return component.allowNavigation;
};
