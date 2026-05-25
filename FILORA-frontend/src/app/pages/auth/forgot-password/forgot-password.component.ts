import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card glass-panel">
        <div class="auth-header">
          <h1 class="auth-title">Reset Password</h1>
          <p class="auth-subtitle">Enter your email to receive recovery instructions</p>
        </div>

        @if (errorMessage()) {
          <div class="auth-error-banner" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
              <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        @if (success()) {
          <div class="auth-success-banner" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
              <path d="m382-400 240-240-56-56-184 183-88-88-56 56 144 145ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
            </svg>
            <span>Recovery email sent. Please check your inbox.</span>
          </div>
        }

        <form (submit)="onSubmit()" #forgotForm="ngForm" class="auth-form" *ngIf="!success()">
          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <input type="email" id="email" class="form-control" name="email"
                   [(ngModel)]="email" required email placeholder="Enter your email address"
                   #emailInput="ngModel">
          </div>

          <button type="submit" class="btn btn-primary auth-submit" [disabled]="forgotForm.invalid || loading()">
            @if (loading()) {
              <div class="spinner-sm"></div>
              <span>Sending instructions...</span>
            } @else {
              <span>Send Recovery Link</span>
            }
          </button>
        </form>

        <div class="auth-footer" style="text-align: center; margin-top: 24px;">
          <a routerLink="/auth/login" class="back-link">Back to Sign In</a>
        </div>
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
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-heading);
      letter-spacing: -0.5px;
      margin-bottom: 8px;
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
    }
    .auth-success-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background-color: var(--success-light);
      color: var(--success);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 24px;
      line-height: 1.4;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .auth-submit {
      padding: 12px;
      font-weight: 600;
    }
    .back-link {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--primary);
    }
    .spinner-sm {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes card-fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
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
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);

  email = '';
  loading = signal(false);
  success = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit() {
    if (!this.email) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.success.set(true);
        } else {
          this.errorMessage.set(res.message || 'Failed to send recovery email.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Request failed.');
      }
    });
  }
}
