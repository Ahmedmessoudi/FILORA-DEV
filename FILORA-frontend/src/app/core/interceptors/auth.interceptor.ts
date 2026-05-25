import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);
  
  const token = authService.getToken();
  let authReq = req;

  // Append token if present
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized access, clear session and navigate to login
        authService.logout();
        toastService.error('Session Expired', 'Your session has expired. Please log in again.');
      } else if (error.status === 403) {
        toastService.error('Access Denied', 'You do not have permission to access this resource.');
      } else if (error.status === 0) {
        toastService.error('Connection Error', 'Cannot connect to the server. Please check your internet connection.');
      } else {
        const errorMsg = error.error?.message || error.message || 'An unexpected error occurred.';
        toastService.error('Error', errorMsg);
      }
      return throwError(() => error);
    })
  );
};
