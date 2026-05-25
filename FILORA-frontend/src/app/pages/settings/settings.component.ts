import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, AppSetting } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div class="header-title-section">
          <h1>{{ 'settings.title' | translate }}</h1>
          <p class="subtitle">Global system properties, quotas, authentication constraints, and language options.</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading configurations...</span>
        </div>
      } @else {
        <form (ngSubmit)="saveSettings()" #settingsForm="ngForm" class="settings-form-layout">
          <!-- Left side: Navigation / Category Selection -->
          <div class="settings-sidebar glass-panel">
            <button type="button" class="tab-btn" [class.active]="activeTab() === 'general'" (click)="activeTab.set('general')">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="M480-120q-33 0-56.5-23.5T400-200q0-33 23.5-56.5T480-280q33 0 56.5 23.5T560-200q0 33-23.5 56.5T480-120Zm0-240q-33 0-56.5-23.5T400-440q0-33 23.5-56.5T480-520q33 0 56.5 23.5T560-440q0 33-23.5 56.5T480-360Zm0-240q-33 0-56.5-23.5T400-680q0-33 23.5-56.5T480-760q33 0 56.5 23.5T560-680q0 33-23.5 56.5T480-600Z"/>
              </svg>
              <span>{{ 'settings.general' | translate }}</span>
            </button>
            <button type="button" class="tab-btn" [class.active]="activeTab() === 'security'" (click)="activeTab.set('security')">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="M240-80q-33 0-56.5-23.5T160-200v-400q0-33 23.5-56.5T240-680h40v-80q0-83 58.5-141.5T480-960q83 0 141.5 58.5T680-760v80h40q33 0 56.5 23.5T800-600v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-680h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v-80Z"/>
              </svg>
              <span>Security & 2FA</span>
            </button>
            <button type="button" class="tab-btn" [class.active]="activeTab() === 'limits'" (click)="activeTab.set('limits')">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z"/>
              </svg>
              <span>{{ 'settings.limits' | translate }}</span>
            </button>
          </div>

          <!-- Right side: Panel Content -->
          <div class="settings-content glass-panel">
            <!-- GENERAL SETTINGS TAB -->
            @if (activeTab() === 'general') {
              <div class="tab-content animate-fade-in">
                <h3 class="panel-section-title">General Instance Settings</h3>
                <p class="section-desc">Manage basic parameters, brand names, regional currencies, and localization parameters.</p>

                <div class="form-group">
                  <label class="form-label" for="system-name">System Instance Name</label>
                  <input type="text" id="system-name" class="form-control" name="SYSTEM_NAME"
                         [(ngModel)]="config.SYSTEM_NAME" required placeholder="e.g. Filora DMS">
                  <span class="field-info">The application name displayed in banners, document titles, and emails.</span>
                </div>

                <div class="form-group">
                  <label class="form-label" for="currency">Local Currency Code</label>
                  <input type="text" id="currency" class="form-control" name="CURRENCY"
                         [(ngModel)]="config.CURRENCY" required placeholder="e.g. EUR, USD, TND">
                  <span class="field-info">Default currency symbol used during metadata parsing and OCR extraction.</span>
                </div>

                <div class="form-row">
                  <div class="form-group col-6">
                    <label class="form-label" for="default-lang">Default System Language</label>
                    <select id="default-lang" class="form-control" name="DEFAULT_LANGUAGE" [(ngModel)]="config.DEFAULT_LANGUAGE">
                      <option value="fr">French (fr)</option>
                      <option value="en">English (en)</option>
                    </select>
                    <span class="field-info">Loaded on guest/first-time visits.</span>
                  </div>

                  <div class="form-group col-6">
                    <label class="form-label" for="system-enabled">System Status</label>
                    <label class="checkbox-container" style="margin-top: 10px;">
                      <input type="checkbox" name="SYSTEM_ENABLED" 
                             [checked]="isCheckedValue(config.SYSTEM_ENABLED)"
                             (change)="onBooleanToggle('SYSTEM_ENABLED', $event)">
                      <span class="checkbox-checkmark"></span>
                      <span class="checkbox-label" style="margin-left: 28px;">System Active (allows user sessions)</span>
                    </label>
                  </div>
                </div>
              </div>
            }

            <!-- SECURITY & 2FA TAB -->
            @if (activeTab() === 'security') {
              <div class="tab-content animate-fade-in">
                <h3 class="panel-section-title">Security & Two-Factor Authentication</h3>
                <p class="section-desc">Manage system-wide 2FA requirements and verification mechanisms.</p>

                <div class="form-group">
                  <label class="checkbox-container">
                    <input type="checkbox" name="TWO_FACTOR_ENABLED" 
                           [checked]="isCheckedValue(config.TWO_FACTOR_ENABLED)"
                           (change)="onBooleanToggle('TWO_FACTOR_ENABLED', $event)">
                    <span class="checkbox-checkmark"></span>
                    <span class="checkbox-label" style="margin-left: 28px; font-weight: 600;">Globally Require 2-Factor Authentication (2FA)</span>
                  </label>
                  <span class="field-info" style="margin-left: 28px; display: block; margin-top: 4px;">Force all active accounts to complete secondary verification.</span>
                </div>

                <div class="form-group" [style.opacity]="isCheckedValue(config.TWO_FACTOR_ENABLED) ? '1' : '0.6'">
                  <label class="form-label" for="2fa-method">Default 2FA Delivery Channel</label>
                  <select id="2fa-method" class="form-control" name="TWO_FACTOR_METHOD" 
                          [(ngModel)]="config.TWO_FACTOR_METHOD"
                          [disabled]="!isCheckedValue(config.TWO_FACTOR_ENABLED)">
                    <option value="EMAIL">Email Dispatch (OTP code sent via SMTP)</option>
                    <option value="TOTP">Authenticator App (TOTP Authenticator QR)</option>
                  </select>
                  <span class="field-info">Specify how verification tokens are delivered to users.</span>
                </div>
              </div>
            }

            <!-- LIMITS & THRESHOLDS TAB -->
            @if (activeTab() === 'limits') {
              <div class="tab-content animate-fade-in">
                <h3 class="panel-section-title">System Allocation Quotas</h3>
                <p class="section-desc">Set hard caps on entities, users, and upload files sizes. Helps prevent server resource exhaustion.</p>

                <div class="form-row">
                  <div class="form-group col-6">
                    <label class="form-label" for="max-users">Max System User Accounts</label>
                    <input type="number" id="max-users" class="form-control" name="SYSTEM_MAX_USERS"
                           [(ngModel)]="config.SYSTEM_MAX_USERS" required min="1">
                    <span class="field-info">Caps the total active user profiles allowed globally.</span>
                  </div>

                  <div class="form-group col-6">
                    <label class="form-label" for="max-file">Max File Upload Limit (KB)</label>
                    <input type="number" id="max-file" class="form-control" name="SYSTEM_MAX_FILE_SIZE"
                           [(ngModel)]="config.SYSTEM_MAX_FILE_SIZE" required min="100">
                    <span class="field-info">Files larger than this limit are blocked during client uploads.</span>
                  </div>

                  <div class="form-group col-6">
                    <label class="form-label" for="table-page-size">Documents Table Page Size</label>
                    <input type="number" id="table-page-size" class="form-control" name="SYSTEM_TABLE_PAGE_SIZE"
                           [(ngModel)]="config.SYSTEM_TABLE_PAGE_SIZE" required min="10" max="200">
                    <span class="field-info">Controls how many documents are fetched per lazy-loaded batch in tables.</span>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group col-6">
                    <label class="form-label" for="max-entities">Max Internal Corporate Entities</label>
                    <input type="number" id="max-entities" class="form-control" name="SYSTEM_MAX_ENTITIES"
                           [(ngModel)]="config.SYSTEM_MAX_ENTITIES" required min="1">
                    <span class="field-info">Caps the entity directories that can be created.</span>
                  </div>

                  <div class="form-group col-6">
                    <label class="form-label" for="max-ext-entities">Max External Partners</label>
                    <input type="number" id="max-ext-entities" class="form-control" name="SYSTEM_MAX_EXTERNAL_ENTITIES"
                           [(ngModel)]="config.SYSTEM_MAX_EXTERNAL_ENTITIES" required min="1">
                    <span class="field-info">Caps the number of vendors/customers in the system.</span>
                  </div>
                </div>
              </div>
            }

            <!-- SAVE BUTTON PANEL -->
            <div class="save-actions-panel">
              <button type="submit" class="btn btn-primary" [disabled]="settingsForm.invalid || saving()">
                @if (saving()) {
                  <div class="spinner-sm"></div>
                  <span>Saving Configuration...</span>
                } @else {
                  <span>{{ 'settings.save' | translate }}</span>
                }
              </button>
            </div>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 14px;
    }
    .header-title-section h1 {
      font-size: 1.75rem;
      margin-bottom: 4px;
    }
    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    /* Split layout */
    .settings-form-layout {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }
    
    .settings-sidebar {
      width: 250px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .settings-content {
      flex: 1;
      padding: 24px;
      min-height: 400px;
      display: flex;
      flex-direction: column;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: none;
      background: none;
      color: var(--text-secondary);
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      font-weight: 500;
      transition: all var(--transition-fast);
    }
    .tab-btn:hover {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }
    .tab-btn.active {
      background-color: var(--primary-light);
      color: var(--primary);
      font-weight: 600;
    }

    .tab-content {
      flex: 1;
    }

    .panel-section-title {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .section-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
    }

    .field-info {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: block;
      margin-top: 4px;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }
    .col-6 { width: 50%; }

    .save-actions-panel {
      margin-top: auto;
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
      display: flex;
      justify-content: flex-end;
    }

    /* Checkbox */
    .checkbox-container {
      display: flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      font-size: 0.9rem;
      user-select: none;
      color: var(--text-secondary);
    }
    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }
    .checkbox-checkmark {
      position: absolute;
      left: 0;
      height: 18px;
      width: 18px;
      background-color: var(--bg-secondary);
      border: 2px solid var(--text-muted);
      border-radius: 4px;
    }
    .checkbox-container:hover input ~ .checkbox-checkmark {
      border-color: var(--primary);
    }
    .checkbox-container input:checked ~ .checkbox-checkmark {
      background-color: var(--primary);
      border-color: var(--primary);
    }
    .checkbox-checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }
    .checkbox-container input:checked ~ .checkbox-checkmark:after {
      display: block;
      left: 5px;
      top: 1px;
      width: 4px;
      height: 8px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .loading-state {
      padding: 60px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      gap: 16px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border-color);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
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
    .animate-fade-in {
      animation: fade-in 0.25s ease-out forwards;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .settings-form-layout {
        flex-direction: column;
      }
      .settings-sidebar {
        width: 100%;
        flex-direction: row;
        overflow-x: auto;
      }
      .tab-btn {
        white-space: nowrap;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly toastService = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  activeTab = signal<'general' | 'security' | 'limits'>('general');

  // local configuration object with seeded keys
  config = {
    SYSTEM_NAME: '',
    SYSTEM_ENABLED: 'false',
    SYSTEM_MAX_USERS: '12',
    SYSTEM_MAX_ENTITIES: '4',
    SYSTEM_MAX_EXTERNAL_ENTITIES: '4',
    SYSTEM_MAX_FILE_SIZE: '1024',
    SYSTEM_TABLE_PAGE_SIZE: '50',
    CURRENCY: 'TND',
    DEFAULT_LANGUAGE: 'fr',
    TWO_FACTOR_ENABLED: 'false',
    TWO_FACTOR_METHOD: 'EMAIL'
  };

  private readonly booleanConfigKeys = new Set(['SYSTEM_ENABLED', 'TWO_FACTOR_ENABLED']);

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.settingsService.getAll().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          const list: AppSetting[] = res.data || [];
          list.forEach(setting => {
            if (setting.key in this.config) {
              if (this.booleanConfigKeys.has(setting.key)) {
                (this.config as any)[setting.key] = this.normalizeBooleanString(setting.value);
              } else {
                (this.config as any)[setting.key] = setting.value;
              }
            }
          });
        } else {
          this.toastService.error('Error', res.message || 'Failed to retrieve system settings.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Error', 'Failed to retrieve settings due to a network error.');
      }
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.settingsService.update(this.config).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.toastService.success(
            'Settings Saved', 
            'System settings successfully updated. Some changes may require page refresh or container reboot.'
          );
          this.loadSettings();
        } else {
          this.toastService.error('Save Failed', res.message || 'Failed to save system settings.');
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toastService.error('Error', err.error?.message || 'Error saving configurations.');
      }
    });
  }

  isCheckedValue(value: string): boolean {
    return this.normalizeBooleanString(value) === 'true';
  }

  onBooleanToggle(key: 'SYSTEM_ENABLED' | 'TWO_FACTOR_ENABLED', event: Event) {
    const target = event.target as HTMLInputElement | null;
    (this.config as any)[key] = target?.checked ? 'true' : 'false';
  }

  private normalizeBooleanString(value: string | undefined | null): 'true' | 'false' {
    return String(value ?? '').trim().toLowerCase() === 'true' ? 'true' : 'false';
  }
}
