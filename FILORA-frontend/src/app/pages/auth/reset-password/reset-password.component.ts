import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card glass-panel">
        <div class="auth-header">
          <h1 class="auth-title">Create New Password</h1>
          <p class="auth-subtitle">Please enter your new secure password below</p>
        </div>

        @if (errorMessage()) {
          <div class="auth-error-banner" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
              <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form (submit)="onSubmit()" #resetForm="ngForm" class="auth-form">
          <div class="form-group">
            <label for="password" class="form-label">New Password</label>
            <input type="password" id="password" class="form-control" name="password"
                   [(ngModel)]="password" required minlength="6" placeholder="At least 6 characters"
                   #passwordInput="ngModel">
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="form-label">Confirm Password</label>
            <input type="password" id="confirmPassword" class="form-control" name="confirmPassword"
                   [(ngModel)]="confirmPassword" required placeholder="Re-type password">
          </div>

          <button type="submit" class="btn btn-primary auth-submit" [disabled]="resetForm.invalid || loading() || password !== confirmPassword">
            @if (loading()) {
              <div class="spinner-sm"></div>
              <span>Resetting password...</span>
            } @else {
              <span>Update Password</span>
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
export class ResetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  token = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    // Get token from URL query parameters
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.token) {
      this.errorMessage.set('Invalid or missing password reset token. Please request another link.');
    }
  }

  onSubmit() {
    if (!this.token || !this.password || this.password !== this.confirmPassword) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.resetPassword(this.token, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.toastService.success('Success', 'Password has been reset. Please log in.');
          this.router.navigate(['/auth/login']);
        } else {
          this.errorMessage.set(res.message || 'Failed to reset password.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Password reset failed.');
      }
    });
  }
}
