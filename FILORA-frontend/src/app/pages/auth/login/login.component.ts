import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card glass-panel">
        <div class="auth-header">
          <h1 class="auth-title">Filora <span class="logo-subtext">DMS</span></h1>
          <p class="auth-subtitle">
            @if (step() === 'LOGIN') {
              Secure document management workspace
            } @else {
              Double-factor authentication required
            }
          </p>
        </div>

        @if (errorMessage()) {
          <div class="auth-error-banner" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
              <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- STEP 1: Login Form (Username/Password) -->
        @if (step() === 'LOGIN') {
          <form (submit)="onLoginSubmit()" #loginForm="ngForm" class="auth-form">
            <div class="form-group">
              <label for="username" class="form-label">Username or Email</label>
              <input type="text" id="username" class="form-control" name="username"
                     [(ngModel)]="username" required placeholder="Enter username/email"
                     #usernameInput="ngModel">
            </div>

            <div class="form-group">
              <div class="label-wrapper">
                <label for="password" class="form-label">Password</label>
                <a routerLink="/auth/forgot-password" class="forgot-link">Forgot?</a>
              </div>
              <input type="password" id="password" class="form-control" name="password"
                     [(ngModel)]="password" required placeholder="Enter password"
                     #passwordInput="ngModel">
            </div>

            <button type="submit" class="btn btn-primary auth-submit" [disabled]="loginForm.invalid || loading()">
              @if (loading()) {
                <div class="spinner-sm"></div>
                <span>Securing session...</span>
              } @else {
                <span>Sign In</span>
              }
            </button>
          </form>
        }

        <!-- STEP 2: 2FA Verification (6-digit OTP code) -->
        @if (step() === '2FA') {
          <form (submit)="on2faSubmit()" #tfaForm="ngForm" class="auth-form">
            <p class="tfa-instructions">
              We've sent a 6-digit verification code to your registered email. Enter it below to complete authorization.
            </p>
            <div class="form-group">
              <label for="code" class="form-label">Verification Code</label>
              <input type="text" id="code" class="form-control code-input" name="code"
                     [(ngModel)]="otpCode" required pattern="[0-9]{6}" maxlength="6"
                     placeholder="000000" autocomplete="one-time-code" #codeInput="ngModel">
            </div>

            <div class="actions-row">
              <button type="button" class="btn btn-secondary" (click)="resetToLogin()" [disabled]="loading()">
                Back to Login
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="tfaForm.invalid || loading()">
                @if (loading()) {
                  <div class="spinner-sm"></div>
                  <span>Verifying...</span>
                } @else {
                  <span>Verify Code</span>
                }
               </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: radial-gradient(circle at 10% 20%, rgba(0, 120, 212, 0.05) 0%, transparent 40%),
                  radial-gradient(circle at 90% 80%, rgba(14, 165, 233, 0.05) 0%, transparent 40%),
                  var(--bg-primary);
      padding: 24px;
    }
    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 40px;
      box-shadow: var(--shadow-premium);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      animation: card-fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .auth-title {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -1px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, var(--primary), #0ea5e9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .logo-subtext {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 2px;
      -webkit-text-fill-color: var(--text-secondary);
    }
    .auth-subtitle {
      font-size: 0.95rem;
      color: var(--text-secondary);
    }
    .auth-error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background-color: var(--error-light);
      color: var(--error);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 24px;
      line-height: 1.4;
      animation: shake 0.3s ease-in-out;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .label-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .forgot-link {
      font-size: 0.825rem;
      font-weight: 500;
      color: var(--primary);
    }
    .auth-submit {
      margin-top: 10px;
      padding: 12px;
      font-weight: 600;
    }
    .tfa-instructions {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.5;
      text-align: center;
      margin-bottom: 8px;
    }
    .code-input {
      text-align: center;
      font-size: 1.5rem;
      letter-spacing: 8px;
      font-weight: 700;
    }
    .actions-row {
      display: flex;
      gap: 12px;
      margin-top: 10px;
    }
    .actions-row button {
      flex: 1;
    }
    .spinner-sm {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    body.dark-theme .spinner-sm {
      border-top-color: var(--primary);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes card-fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    @media (max-width: 480px) {
      .auth-card {
        padding: 24px;
        border: none;
        box-shadow: none;
        background: transparent;
      }
      .auth-page {
        align-items: flex-start;
        padding-top: 40px;
      }
    }
  `]
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // States
  step = signal<'LOGIN' | '2FA'>('LOGIN');
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Input bindings
  username = '';
  password = '';
  otpCode = '';

  onLoginSubmit() {
    if (!this.username || !this.password) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          const status = res.data.status;
          if (status === '2FA_REQUIRED') {
            this.step.set('2FA');
            this.toastService.info('Verification Required', 'A verification code was sent to your email.');
          } else if (status === 'SUCCESS') {
            this.navigateAfterLogin(res.data);
          }
        } else {
          this.errorMessage.set(res.message || 'Authentication failed.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Login request failed.');
      }
    });
  }

  on2faSubmit() {
    if (!this.otpCode) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.verify2Fa(this.username, this.otpCode).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data && res.data.status === 'SUCCESS') {
          this.navigateAfterLogin(res.data);
        } else {
          this.errorMessage.set(res.message || 'Invalid validation code.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || err.message || '2FA verification failed.');
      }
    });
  }

  resetToLogin() {
    this.step.set('LOGIN');
    this.otpCode = '';
    this.errorMessage.set(null);
  }

  private navigateAfterLogin(session: any) {
    // If the user has a temporary password, force change/reset password
    if (session.hasTemporaryPassword) {
      this.toastService.warning('Security Notice', 'You are logged in with a temporary password. Please reset it.');
      // Direct them to reset password or settings
    }

    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dms/temp-documents';
    this.router.navigateByUrl(returnUrl);
  }
}
