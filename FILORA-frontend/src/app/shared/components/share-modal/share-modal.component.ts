import { Component, Input, Output, EventEmitter, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../../core/services/document.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ 'dms.share_title' | translate }}</h3>
          <button class="btn-close" (click)="onCancel()" [disabled]="sending()">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
              <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <form (ngSubmit)="onConfirm()" #shareForm="ngForm">
            <!-- Recipient Email -->
            <div class="form-group">
              <label class="form-label" for="share-email">{{ 'dms.share_to' | translate }} *</label>
              <input type="email" id="share-email" class="form-control" name="email" 
                     [(ngModel)]="email" required email #emailRef="ngModel"
                     placeholder="e.g. partner@company.com">
              @if (emailRef.invalid && emailRef.touched) {
                <span class="error-text">Please enter a valid email address.</span>
              }
            </div>

            <!-- Subject -->
            <div class="form-group">
              <label class="form-label" for="share-subject">{{ 'dms.share_subject' | translate }}</label>
              <input type="text" id="share-subject" class="form-control" name="subject" 
                     [(ngModel)]="subject">
            </div>

            <!-- Body Message -->
            <div class="form-group">
              <label class="form-label" for="share-body">{{ 'dms.share_body' | translate }}</label>
              <textarea id="share-body" class="form-control" name="body" 
                        [(ngModel)]="body" rows="4" placeholder="Hello, please find the document attached."></textarea>
            </div>

            <!-- Attachments Toggle -->
            <div class="attachments-section">
              <span class="form-label attachments-title">Attachments</span>
              
              <label class="checkbox-container">
                <input type="checkbox" name="attachOriginal" [(ngModel)]="attachOriginal">
                <span class="checkbox-label">{{ 'dms.attach_original' | translate }} ({{ docName }})</span>
              </label>

              <label class="checkbox-container">
                <input type="checkbox" name="attachOcr" [(ngModel)]="attachOcr">
                <span class="checkbox-label">{{ 'dms.attach_ocr' | translate }}</span>
              </label>

              <label class="checkbox-container">
                <input type="checkbox" name="attachJson" [(ngModel)]="attachJson">
                <span class="checkbox-label">{{ 'dms.attach_json' | translate }}</span>
              </label>
            </div>
            
            <button type="submit" style="display: none;" #submitBtn></button>
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onCancel()" [disabled]="sending()">{{ 'dms.cancel' | translate }}</button>
          <button class="btn btn-primary" 
                  [disabled]="shareForm.invalid || sending() || (!attachOriginal && !attachOcr && !attachJson)" 
                  (click)="submitBtn.click()">
            @if (sending()) {
              <div class="spinner-sm"></div>
              <span>Sending...</span>
            } @else {
              <span>{{ 'dms.send' | translate }}</span>
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      animation: fade-in 0.2s ease-out;
    }
    .modal-container {
      width: 100%;
      max-width: 550px;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-premium);
      overflow: hidden;
      animation: scale-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.15);
    }
    .modal-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
    }
    .modal-header h3 {
      font-size: 1.2rem;
      font-weight: 600;
    }
    .btn-close {
      cursor: pointer;
      color: var(--text-muted);
      transition: color var(--transition-fast);
      display: flex;
      align-items: center;
    }
    .btn-close:hover:not(:disabled) {
      color: var(--text-primary);
    }
    .btn-close:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .modal-body {
      padding: 20px;
    }
    .attachments-section {
      margin-top: 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 14px;
      background-color: var(--bg-tertiary);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .attachments-title {
      font-weight: 600;
      font-size: 0.85rem;
      margin-bottom: 4px;
    }
    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      color: var(--text-secondary);
      user-select: none;
    }
    .checkbox-container input {
      cursor: pointer;
      width: 16px;
      height: 16px;
      accent-color: var(--primary);
    }
    .error-text {
      font-size: 0.8rem;
      color: var(--error);
      margin-top: 4px;
      display: block;
    }
    .modal-footer {
      padding: 12px 20px;
      background-color: var(--bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid var(--border-color);
    }
    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scale-in {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class ShareModalComponent implements OnInit {
  @Input() docId!: number;
  @Input() docName = '';

  @Output() shared = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private readonly documentService = inject(DocumentService);
  private readonly toastService = inject(ToastService);

  email = '';
  subject = '';
  body = '';
  attachOriginal = true;
  attachOcr = false;
  attachJson = false;

  sending = signal(false);

  ngOnInit() {
    // Set default subject and body
    this.subject = `Filora DMS - Shared Document: ${this.docName}`;
    this.body = `Bonjour,\n\nVeuillez trouver ci-joint le document "${this.docName}" partagé depuis l'application Filora DMS.\n\nCordialement,`;
  }

  onConfirm() {
    if (!this.email) return;

    this.sending.set(true);
    this.documentService.share(this.docId, {
      recipientEmail: this.email,
      subject: this.subject,
      body: this.body,
      attachOriginal: this.attachOriginal,
      attachOcrText: this.attachOcr,
      attachOcrJson: this.attachJson
    }).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res.success) {
          this.toastService.success('Email Sent', `Email successfully sent to ${this.email}.`);
          this.shared.emit();
        } else {
          this.toastService.error('Failed', res.message || 'Failed to send document email.');
        }
      },
      error: (err) => {
        this.sending.set(false);
        this.toastService.error('Error', err.error?.message || 'Error occurred while sharing document.');
      }
    });
  }

  onCancel() {
    if (this.sending()) return;
    this.cancel.emit();
  }
}
