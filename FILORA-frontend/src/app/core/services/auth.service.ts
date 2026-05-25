import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ToastService } from './toast.service';

export interface UserSession {
  username: string;
  role: 'SUPERUSER' | 'ADMIN' | 'USER';
  token?: string;
  refreshToken?: string;
  hasTemporaryPassword?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly apiUrl = '/api/auth';

  // Signals for state management
  readonly session = signal<UserSession | null>(null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly isSuperuser = computed(() => this.session()?.role === 'SUPERUSER');
  readonly isAdmin = computed(() => this.session()?.role === 'ADMIN' || this.session()?.role === 'SUPERUSER');
  readonly currentUser = computed(() => this.session()?.username || 'anonymous');

  // token expiry watcher handle
  private tokenWatcherId: any = null;

  constructor() {
    this.loadSessionFromStorage();
    // Start a watcher to proactively detect token expiration and force logout
    this.startTokenExpiryWatcher();
  }

  login(usernameOrEmail: string, passwordOrToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, {
      username: usernameOrEmail,
      password: passwordOrToken
    }).pipe(
      tap(res => {
        if (res.success && res.data) {
          const data = res.data;
          if (data.status === 'SUCCESS') {
            this.setSession({
              username: data.username,
              role: this.normalizeRole(data.role),
              token: data.token,
              refreshToken: data.refreshToken,
              hasTemporaryPassword: data.hasTemporaryPassword
            });
            this.toastService.success('Welcome back', `Logged in successfully as ${data.username}`);
          }
        }
      })
    );
  }

  verify2Fa(username: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-2fa`, {
      username,
      code
    }).pipe(
      tap(res => {
        if (res.success && res.data && res.data.status === 'SUCCESS') {
          const data = res.data;
          this.setSession({
            username: data.username,
            role: this.normalizeRole(data.role),
            token: data.token,
            refreshToken: data.refreshToken,
            hasTemporaryPassword: data.hasTemporaryPassword
          });
          this.toastService.success('Welcome back', `Logged in successfully as ${data.username}`);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email }).pipe(
      tap(res => {
        if (res.success) {
          this.toastService.success('Request Received', 'Password reset instructions have been sent to your email.');
        }
      })
    );
  }

  resetPassword(token: string, passwordOrToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, {
      token,
      password: passwordOrToken
    }).pipe(
      tap(res => {
        if (res.success) {
          this.toastService.success('Success', 'Your password has been reset successfully. Please log in.');
        }
      })
    );
  }

  logout(): void {
    const currentSession = this.session();
    const token = currentSession?.refreshToken || '';

    // Clear local state first for immediate UI feedback
    this.clearSession();

    // stop watcher to avoid race conditions
    this.stopTokenExpiryWatcher();

    if (token) {
      this.http.post(`${this.apiUrl}/logout?refreshToken=${token}`, {}).subscribe({
        next: () => this.toastService.info('Goodbye', 'You have logged out successfully.'),
        error: () => {}
      });
    } else {
      this.toastService.info('Goodbye', 'You have logged out successfully.');
    }
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this.session()?.token || null;
  }

  private setSession(sessionData: UserSession): void {
    const normalized = {
      ...sessionData,
      role: this.normalizeRole(sessionData.role)
    };
    this.session.set(normalized);
    localStorage.setItem('filora_session', JSON.stringify(normalized));
  }

  private clearSession(): void {
    this.session.set(null);
    localStorage.removeItem('filora_session');
  }

  private loadSessionFromStorage(): void {
    try {
      const stored = localStorage.getItem('filora_session');
      if (stored) {
        const parsed = JSON.parse(stored) as UserSession;
        this.session.set({
          ...parsed,
          role: this.normalizeRole(parsed.role)
        });
      }
    } catch (e) {
      console.error('Error loading session from storage', e);
      this.clearSession();
    }
  }

  // Periodically check token expiry and force logout when expired
  private startTokenExpiryWatcher(intervalMs: number = 60000) {
    // ensure any previous watcher is cleared
    this.stopTokenExpiryWatcher();
    this.tokenWatcherId = setInterval(() => {
      const token = this.getToken();
      if (token && this.isTokenExpired(token)) {
        // proactively clear session and navigate to login
        this.clearSession();
        this.toastService.info('Session Expired', 'Your session has expired. Please log in again.');
        this.router.navigate(['/auth/login']);
        this.stopTokenExpiryWatcher();
      }
    }, intervalMs);
  }

  private stopTokenExpiryWatcher() {
    if (this.tokenWatcherId) {
      clearInterval(this.tokenWatcherId);
      this.tokenWatcherId = null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length < 2) return false;
      const payload = parts[1];
      // Base64 url decode
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const data = JSON.parse(json);
      const exp = data.exp;
      if (!exp) return false;
      const now = Math.floor(Date.now() / 1000);
      // consider token expired a few seconds before actual expiry to avoid races
      return exp <= (now + 5);
    } catch (e) {
      return false;
    }
  }

  private normalizeRole(role: string | null | undefined): 'SUPERUSER' | 'ADMIN' | 'USER' {
    let value = (role || '').toString().trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (value.startsWith('ROLE_')) {
      value = value.slice(5);
    }
    if (value === 'ADMIN') {
      return 'ADMIN';
    }
    if (value === 'SUPERUSER' || value === 'SUPER_ADMIN' || value === 'SUPERADMIN' || value === 'SUPER_USER') {
      return 'SUPERUSER';
    }
    return 'USER';
  }
}
