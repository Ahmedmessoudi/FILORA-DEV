import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  if (!authService.isLoggedIn()) {
    toastService.error('Unauthorized', 'Please log in to access this page.');
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Check roles if defined in route data
  const requiredRoles = route.data['roles'] as Array<string>;
  if (requiredRoles) {
    const userSession = authService.session();
    const userRole = userSession?.role;
    if (!userRole || !requiredRoles.includes(userRole)) {
      toastService.warning('Access Denied', 'You do not have the required permissions to view this page.');
      router.navigate(['/dms']);
      return false;
    }
  }

  return true;
};
