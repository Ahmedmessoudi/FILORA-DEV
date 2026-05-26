import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, forkJoin, of } from 'rxjs';
import { DocumentService, DocumentDto } from '../../../core/services/document.service';
import { PartnerService, PartnerDto } from '../../../core/services/partner.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

type PreviewTab = 'raw' | 'ocr';

@Component({
  selector: 'app-ocr-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="modal-header">
          <div class="header-left">
            <h3>{{ 'dms.ocr_title' | translate }}</h3>
            <span class="doc-badge">{{ docName }}</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary btn-sm" (click)="reprocessOcr()" [disabled]="loading() || saving() || reprocessing()">
              @if (reprocessing()) {
                <span class="spinner-xs"></span>
                <span>Processing...</span>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                  <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 128.5 26.5T712-704h-92v80h220v-220h-80v87q-48-47-111-73.5T480-880q-166 0-283 117T80-480q0 166 117 283t283 117q127 0 222.5-67.5T790-330h-86q-37 54-97 87t-127 33Z"/>
                </svg>
                <span>{{ 'dms.reprocess_ocr' | translate }}</span>
              }
            </button>
            <button class="btn-close" (click)="onCancel()" [disabled]="saving() || reprocessing()">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Two-Panel Split Layout Body -->
        <div class="modal-body split-layout">
          
          <!-- Left Panel: Document Preview (40%) -->
          <div class="preview-panel">
            <div class="preview-tabs">
              <button type="button" class="preview-tab" [class.active]="activePreviewTab() === 'raw'" (click)="activePreviewTab.set('raw')">Raw file</button>
              <button type="button" class="preview-tab" [class.active]="activePreviewTab() === 'ocr'" (click)="activePreviewTab.set('ocr')">OCR text</button>
            </div>

            @if (previewLoading()) {
              <div class="preview-placeholder">
                <div class="spinner"></div>
                <span>Loading preview...</span>
              </div>
            } @else if (previewError()) {
              <div class="preview-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="var(--text-muted)">
                  <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T680-80H240Zm280-570v-150H240v640h480v-490H520ZM240-800v150-150 640-640Z"/>
                </svg>
                <span>{{ previewError() }}</span>
              </div>
            } @else {
              @if (activePreviewTab() === 'raw') {
                @if (rawPreviewUrl()) {
                  @if (rawPreviewMimeType()?.startsWith('image/')) {
                    <img [src]="rawPreviewUrl()!" class="image-preview" alt="Raw document preview">
                  } @else {
                    <iframe [src]="rawPreviewUrl()!" class="iframe-preview" title="Raw document preview"></iframe>
                  }
                } @else {
                  <div class="preview-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="var(--text-muted)">
                      <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T680-80H240Zm280-570v-150H240v640h480v-490H520ZM240-800v150-150 640-640Z"/>
                    </svg>
                    <span>Preview unavailable</span>
                  </div>
                }
              } @else {
                @if (ocrPreviewUrl()) {
                  <iframe [src]="ocrPreviewUrl()!" class="iframe-preview" title="OCR extracted preview"></iframe>
                } @else {
                  <div class="preview-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48" fill="var(--text-muted)">
                      <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T680-80H240Zm280-570v-150H240v640h480v-490H520ZM240-800v150-150 640-640Z"/>
                    </svg>
                    <span>No OCR text available yet</span>
                  </div>
                }
              }
            }
          </div>

          <!-- Right Panel: Data Extracted Metadata Form (60%) -->
          <div class="form-panel">
            @if (loading()) {
              <div class="loading-state">
                <div class="spinner"></div>
                <span>Loading metadata...</span>
              </div>
            } @else {
              <h4 class="section-title section-title-main">
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                  <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Zm-40-120h80v-80h-80v80Zm0-160h80v-240h-80v240Z"/>
                </svg>
                <span>Document details</span>
              </h4>

              <div class="form-group document-name-group">
                <label class="form-label" for="document-name">Document name</label>
                <input type="text" id="document-name" class="form-control form-control-lg" [(ngModel)]="documentName" placeholder="Example: ACME invoice June 2026">
              </div>

              <div class="form-row">
                <div class="form-group col-6">
                  <label class="form-label" for="invoice-date">Document date</label>
                  <input type="date" id="invoice-date" class="form-control" [(ngModel)]="documentDate">
                  <small class="field-hint">Used for both invoice and non-invoice documents.</small>
                </div>

                <div class="form-group col-6">
                  <label class="form-label" for="invoice-duedate">Due date</label>
                  <input type="date" id="invoice-duedate" class="form-control" [(ngModel)]="dueDate">
                  <small class="field-hint">Optional for non-facturable documents.</small>
                </div>
              </div>

              <div class="invoice-toggle-card" [class.invoice-toggle-card-active]="isInvoice">
                <label class="invoice-toggle-row" for="invoice-toggle">
                  <span class="invoice-toggle-copy">
                    <span class="invoice-toggle-title">Facturable ?</span>
                    <span class="invoice-toggle-subtitle">If OCR missed the invoice type, you can override it here.</span>
                  </span>
                  <span class="invoice-switch">
                    <input id="invoice-toggle" type="checkbox" [(ngModel)]="isInvoice" (ngModelChange)="onInvoiceToggle($event)">
                    <span class="invoice-switch-track">
                      <span class="invoice-switch-thumb"></span>
                    </span>
                  </span>
                </label>
              </div>

              @if (isInvoice) {
                <div class="billing-section">
                  <div class="billing-section-header">
                    <div>
                      <h4>
                        <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                          <path d="M440-120v-80H280v-80h360q17 0 28.5-11.5T680-320q0-17-11.5-28.5T640-360H360q-50 0-85-35t-35-85q0-50 35-85t85-35h80v-80h80v80h160v80H320q-17 0-28.5 11.5T280-480q0 17 11.5 28.5T320-440h280q50 0 85 35t35 85q0 50-35 85t-85 35h-40v80h-80Z"/>
                        </svg>
                        Billing details
                      </h4>
                      <p>Visible only for facturable documents. This block is highlighted to guide the user through invoice validation.</p>
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group col-6">
                      <label class="form-label" for="invoice-number">Invoice number</label>
                      <input type="text" id="invoice-number" class="form-control" [(ngModel)]="invoiceNumber" placeholder="INV-2026-001">
                    </div>

                    <div class="form-group col-6">
                      <label class="form-label" for="invoice-partner">Vendor / Partner</label>
                      <select id="invoice-partner" class="form-control" [(ngModel)]="selectedPartnerId">
                        <option [ngValue]="null">-- Select Vendor/Partner --</option>
                        @for (partner of partners(); track partner.id) {
                          <option [ngValue]="partner.id">{{ partner.companyName }}</option>
                        }
                      </select>
                    </div>
                  </div>

                  <div class="form-row text-fields">
                    <div class="form-group col-4">
                      <label class="form-label" for="amount-ht">HT</label>
                      <input type="number" step="0.01" id="amount-ht" class="form-control" [(ngModel)]="totalHt" (input)="recalculateTtc()" placeholder="0.00">
                    </div>

                    <div class="form-group col-4">
                      <label class="form-label" for="amount-tva">VAT</label>
                      <input type="number" step="0.01" id="amount-tva" class="form-control" [(ngModel)]="tva" (input)="recalculateTtc()" placeholder="0.00">
                    </div>

                    <div class="form-group col-4">
                      <label class="form-label" for="amount-ttc">TTC</label>
                      <input type="number" step="0.01" id="amount-ttc" class="form-control" [(ngModel)]="totalTtc" placeholder="0.00">
                    </div>
                  </div>

                  <div class="line-items-section billing-highlight">
                    <div class="line-items-header">
                      <div>
                        <h5>
                          <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor">
                            <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T680-80H240Zm280-570v-150H240v640h480v-490H520ZM240-800v150-150 640-640Z"/>
                          </svg>
                          Billing line items
                        </h5>
                        <span class="billing-section-subtitle">Add or correct extracted amounts before saving.</span>
                      </div>
                      <button type="button" class="btn btn-secondary btn-xs" (click)="addLineItem()">+ Add Item</button>
                    </div>

                    <div class="line-items-table-container">
                      <table class="line-items-table">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th style="width: 80px;">Qty</th>
                            <th style="width: 100px;">Unit</th>
                            <th style="width: 100px;">Total</th>
                            <th style="width: 50px;"></th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (item of lineItems(); track $index; let idx = $index) {
                            <tr>
                              <td>
                                <input type="text" class="table-input" [(ngModel)]="item.description" placeholder="Item description">
                              </td>
                              <td>
                                <input type="number" class="table-input text-right" [(ngModel)]="item.quantity" (input)="updateItemTotal(idx)">
                              </td>
                              <td>
                                <input type="number" step="0.01" class="table-input text-right" [(ngModel)]="item.unitPrice" (input)="updateItemTotal(idx)">
                              </td>
                              <td class="text-right text-bold">
                                {{ item.total | number:'1.2-2' }}
                              </td>
                              <td class="text-center">
                                <button type="button" class="btn-item-remove" (click)="removeLineItem(idx)">
                                  <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="var(--error)">
                                    <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          }
                          @if (lineItems().length === 0) {
                            <tr>
                              <td colspan="5" class="table-empty-row">No line items extracted.</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="non-invoice-card">
                  <div class="non-invoice-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="currentColor">
                      <path d="M480-120q-92 0-172-35t-139-94q-59-59-94-139T40-560q0-92 35-172t94-139q59-59 139-94t172-35q92 0 172 35t139 94q59 59 94 139t35 172q0 92-35 172t-94 139q-59 59-139 94t-172 35Zm0-80q142 0 241-99t99-241q0-142-99-241t-241-99q-142 0-241 99T140-560q0 142 99 241t241 99Zm-40-160h80v-80h-80v80Zm0-160h80v-240h-80v240Z"/>
                    </svg>
                  </div>
                  <div>
                    <h5>Non-facturable document</h5>
                    <p>Billing fields are hidden. You can still keep the document name and dates above, and switch this back on anytime.</p>
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onCancel()" [disabled]="saving() || reprocessing()">{{ 'dms.cancel' | translate }}</button>
          <button class="btn btn-primary" (click)="saveChanges()" [disabled]="loading() || saving() || reprocessing()">
            @if (saving()) {
              <div class="spinner-sm"></div>
              <span>Saving...</span>
            } @else {
              <span>{{ 'dms.save_changes' | translate }}</span>
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
      z-index: 1050;
      animation: fade-in 0.2s ease-out;
    }
    .modal-container {
      width: 95vw;
      height: 90vh;
      max-width: 1400px;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-premium);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-header {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-left h3 {
      font-size: 1.25rem;
      font-weight: 600;
    }
    .doc-badge {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--primary);
      background-color: var(--primary-light);
      padding: 4px 10px;
      border-radius: var(--radius-md);
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
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
    
    .modal-body.split-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
      padding: 0;
    }
    .preview-panel {
      width: 42%;
      height: 100%;
      border-right: 1px solid var(--border-color);
      background-color: #2b2b2b;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    .preview-tabs {
      display: flex;
      gap: 8px;
      padding: 12px 12px 0;
      background: #2b2b2b;
      flex-shrink: 0;
    }
    .preview-tab {
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.06);
      color: #fff;
      padding: 8px 12px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .preview-tab.active {
      background: var(--primary);
      border-color: var(--primary);
    }
    .iframe-preview {
      width: 100%;
      height: auto;
      flex: 1;
      min-height: 0;
      border: none;
    }
    .image-preview {
      width: 100%;
      height: auto;
      flex: 1;
      min-height: 0;
      object-fit: contain;
      background: #111;
    }
    .preview-placeholder {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      gap: 12px;
      min-height: 0;
    }
    
    .form-panel {
      width: 58%;
      height: 100%;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background-color: var(--bg-secondary);
    }
    .section-title {
      font-size: 0.95rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      border-left: 3px solid var(--primary);
      padding-left: 8px;
      margin-bottom: 8px;
    }
    .section-title-main {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
      border-left-color: var(--primary);
      margin-bottom: 12px;
    }
    .field-hint {
      display: block;
      margin-top: 6px;
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .invoice-toggle-card {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
      padding: 14px 16px;
      transition: all var(--transition-fast);
    }
    .invoice-toggle-card-active {
      border-color: rgba(0, 120, 212, 0.35);
      box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.08);
    }
    .invoice-toggle-row {
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
    }
    .invoice-toggle-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    .invoice-toggle-title {
      font-weight: 700;
      color: var(--text-primary);
    }
    .invoice-toggle-subtitle {
      font-size: 0.82rem;
      color: var(--text-muted);
      line-height: 1.35;
    }
    .invoice-switch {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .invoice-switch input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .invoice-switch-track {
      position: relative;
      width: 52px;
      height: 30px;
      background: var(--border-color);
      border-radius: 999px;
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }
    .invoice-switch-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #fff;
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition-fast);
    }
    .invoice-switch input:checked + .invoice-switch-track {
      background: var(--primary);
    }
    .invoice-switch input:checked + .invoice-switch-track .invoice-switch-thumb {
      transform: translateX(22px);
    }
    .billing-section {
      border: 1px solid rgba(0, 120, 212, 0.18);
      border-radius: var(--radius-lg);
      padding: 16px;
      background: linear-gradient(180deg, rgba(0, 120, 212, 0.06), rgba(0, 120, 212, 0.02));
      box-shadow: 0 12px 28px rgba(0, 120, 212, 0.06);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .billing-section-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .billing-section-header h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--primary);
      font-size: 0.98rem;
      font-weight: 800;
    }
    .billing-section-header p {
      margin-top: 4px;
      font-size: 0.82rem;
      color: var(--text-secondary);
      max-width: 680px;
      line-height: 1.4;
    }
    .billing-highlight {
      border-color: rgba(0, 120, 212, 0.22);
      background: rgba(255, 255, 255, 0.35);
    }
    .non-invoice-card {
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px dashed var(--border-color);
      border-radius: var(--radius-lg);
      padding: 16px;
      background: var(--bg-tertiary);
    }
    .non-invoice-icon {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: var(--bg-primary);
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .non-invoice-card h5 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .col-6 { width: 50%; }
    .col-4 { width: 33.33%; }
    
    .line-items-section {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin-top: 12px;
    }
    .line-items-header {
      background-color: var(--bg-tertiary);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
    }
    .line-items-header h5 {
      font-size: 0.9rem;
      font-weight: 600;
    }
    .btn-xs {
      padding: 4px 10px;
      font-size: 0.75rem;
      border-radius: var(--radius-sm);
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.85rem;
    }
    .line-items-table-container {
      max-height: 220px;
      overflow-y: auto;
    }
    .line-items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .line-items-table th {
      background-color: var(--bg-tertiary);
      color: var(--text-secondary);
      font-weight: 600;
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    .line-items-table td {
      padding: 6px 10px;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }
    .table-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.85rem;
    }
    .table-input:focus {
      border-color: var(--primary);
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-bold { font-weight: 600; }
    .table-empty-row {
      padding: 24px;
      text-align: center;
      color: var(--text-muted);
      font-style: italic;
    }
    .btn-item-remove {
      cursor: pointer;
      display: inline-flex;
      padding: 4px;
      border-radius: var(--radius-sm);
    }
    .btn-item-remove:hover {
      background-color: var(--error-light);
    }
    
    .modal-footer {
      padding: 12px 20px;
      background-color: var(--bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid var(--border-color);
      flex-shrink: 0;
    }
    
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 60px;
      color: var(--text-secondary);
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-sm, .spinner-xs {
      border: 2px solid #ffffff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-sm {
      width: 16px;
      height: 16px;
    }
    .spinner-xs {
      width: 12px;
      height: 12px;
      display: inline-block;
      margin-right: 6px;
      vertical-align: middle;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scale-in {
      from { transform: scale(0.97); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @media (max-width: 992px) {
      .modal-body.split-layout {
        flex-direction: column;
        overflow-y: auto;
      }
      .preview-panel {
        width: 100%;
        height: 350px;
      }
      .form-panel {
        width: 100%;
        height: auto;
        overflow-y: visible;
      }
    }
  `]
})
export class OcrReviewModalComponent implements OnInit, OnDestroy {
  @Input() docId!: number;
  @Input() docName = '';

  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private readonly documentService = inject(DocumentService);
  private readonly partnerService = inject(PartnerService);
  private readonly toastService = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  activePreviewTab = signal<PreviewTab>('raw');
  rawPreviewUrl = signal<SafeResourceUrl | null>(null);
  ocrPreviewUrl = signal<SafeResourceUrl | null>(null);
  rawPreviewMimeType = signal<string | null>(null);
  previewLoading = signal(false);
  previewError = signal<string | null>(null);
  partners = signal<PartnerDto[]>([]);
  lineItems = signal<InvoiceLineItem[]>([]);

  // Form bindings
  isInvoice = false;
  invoiceNumber = '';
  documentName = '';
  currency = 'EUR';
  documentDate = '';
  dueDate = '';
  selectedPartnerId: number | null = null;
  totalHt = 0;
  tva = 0;
  totalTtc = 0;

  loading = signal(true);
  saving = signal(false);
  reprocessing = signal(false);

  private rawObjectUrl: string | null = null;
  private ocrObjectUrl: string | null = null;

  ngOnInit() {
    this.loadDocumentData();
  }

  ngOnDestroy() {
    if (this.rawObjectUrl) {
      URL.revokeObjectURL(this.rawObjectUrl);
    }
    if (this.ocrObjectUrl) {
      URL.revokeObjectURL(this.ocrObjectUrl);
    }
  }

  loadDocumentData() {
    this.loading.set(true);
    this.previewLoading.set(true);
    this.previewError.set(null);
    forkJoin({
      doc: this.documentService.getById(this.docId).pipe(catchError(() => of(null))),
      partnersList: this.partnerService.getAll().pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res: any) => {
        const partnerList = Array.isArray(res.partnersList)
          ? res.partnersList
          : (res.partnersList?.data ?? []);
        this.partners.set(partnerList);

        if (res.doc?.success && res.doc.data) {
          const doc: DocumentDto = res.doc.data;
          this.isInvoice = !!doc.isInvoice;
          this.invoiceNumber = doc.invoiceNumber || '';
          this.documentName = doc.filename || doc.originalFilename || this.docName || '';
          this.docName = this.documentName;
          this.currency = doc.currency || 'EUR';
          this.totalHt = doc.totalHt || 0;
          this.tva = doc.tva || 0;
          this.totalTtc = doc.totalTtc || 0;

          if (doc.documentDate) {
            this.documentDate = doc.documentDate.split('T')[0];
          }
          if (doc.dueDate) {
            this.dueDate = doc.dueDate.split('T')[0];
          }

          if (doc.partnerId) {
            this.selectedPartnerId = doc.partnerId;
          } else if (doc.partnerName) {
            const matched = partnerList.find((partner: PartnerDto) => partner.companyName?.toLowerCase() === doc.partnerName?.toLowerCase());
            this.selectedPartnerId = matched?.id ?? null;
          }

          try {
            const extracted = doc.extractedData ? (typeof doc.extractedData === 'string' ? JSON.parse(doc.extractedData) : doc.extractedData) : null;
            const lineItems = Array.isArray(extracted) ? extracted : extracted?.line_items;
            if (Array.isArray(lineItems)) {
              this.lineItems.set(lineItems.map((item: any) => ({
                description: item.description || '',
                quantity: Number(item.quantity ?? item.qty ?? 0),
                unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
                total: Number(item.total ?? 0)
              })));
            }
          } catch (e) {
            console.error('Error parsing extracted line items JSON', e);
          }

          this.loadPreviewAssets(doc);
        }
        this.loading.set(false);
        this.previewLoading.set(false);
      },
      error: () => {
        this.toastService.error('Error', 'Failed to retrieve document metadata.');
        this.loading.set(false);
        this.previewLoading.set(false);
      }
    });
  }

  private loadPreviewAssets(doc: DocumentDto) {
    if (this.rawObjectUrl) {
      URL.revokeObjectURL(this.rawObjectUrl);
      this.rawObjectUrl = null;
    }
    if (this.ocrObjectUrl) {
      URL.revokeObjectURL(this.ocrObjectUrl);
      this.ocrObjectUrl = null;
    }

    this.documentService.getPreviewBlob(this.docId).subscribe({
      next: (blob) => {
        this.rawPreviewMimeType.set(blob.type || doc.mimeType || null);
        this.rawObjectUrl = URL.createObjectURL(blob);
        this.rawPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.rawObjectUrl));
      },
      error: () => {
        this.previewError.set('Unable to load raw file preview.');
      }
    });

    let ocrText = 'No OCR output is available yet.';
    if (doc.extractedText && doc.extractedText.trim()) {
      ocrText = doc.extractedText;
    } else if (doc.rapport && doc.rapport.trim()) {
      ocrText = doc.rapport;
    } else if (doc.extractedData) {
      try {
        ocrText = JSON.stringify(typeof doc.extractedData === 'string' ? JSON.parse(doc.extractedData) : doc.extractedData, null, 2);
      } catch {
        ocrText = String(doc.extractedData);
      }
    }

    const ocrBlob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
    this.ocrObjectUrl = URL.createObjectURL(ocrBlob);
    this.ocrPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.ocrObjectUrl));
  }

  recalculateTtc() {
    this.totalTtc = Number((Number(this.totalHt) + Number(this.tva)).toFixed(2));
  }

  addLineItem() {
    this.lineItems.update(items => [
      ...items,
      { description: 'New Line Item', quantity: 1, unitPrice: 0, total: 0 }
    ]);
  }

  onInvoiceToggle(nextValue: boolean) {
    this.isInvoice = nextValue;
    if (!nextValue) {
      this.selectedPartnerId = null;
    }
  }

  updateItemTotal(index: number) {
    const items = [...this.lineItems()];
    const item = items[index];
    item.total = Number((Number(item.quantity) * Number(item.unitPrice)).toFixed(2));
    this.lineItems.set(items);
  }

  removeLineItem(index: number) {
    this.lineItems.update(items => items.filter((_, i) => i !== index));
  }

  reprocessOcr() {
    this.reprocessing.set(true);
    this.documentService.reprocessOcr(this.docId).subscribe({
      next: (res) => {
        this.reprocessing.set(false);
        if (res.success) {
          this.toastService.success('OCR Reprocessing', 'Reprocessing started. Updating metadata shortly.');
          // Reload document details to fetch updated OCR
          this.loadDocumentData();
        } else {
          this.toastService.error('Failure', res.message || 'Failed to trigger OCR reprocessing.');
        }
      },
      error: (err) => {
        this.reprocessing.set(false);
        this.toastService.error('Error', err.error?.message || 'Error executing OCR reprocess.');
      }
    });
  }

  saveChanges() {
    this.saving.set(true);
    
    // Prepare partial update DTO
    const updatePayload: Partial<DocumentDto> = {
      filename: this.documentName,
      isInvoice: this.isInvoice,
      invoiceNumber: this.isInvoice ? this.invoiceNumber : undefined,
      currency: this.isInvoice ? this.currency : undefined,
      totalHt: this.isInvoice ? Number(this.totalHt) : undefined,
      tva: this.isInvoice ? Number(this.tva) : undefined,
      totalTtc: this.isInvoice ? Number(this.totalTtc) : undefined,
      documentDate: this.documentDate || undefined,
      dueDate: this.dueDate || undefined,
      extractedData: this.isInvoice ? {
        line_items: this.lineItems()
      } : undefined
    };

    const partnerId = this.isInvoice && this.selectedPartnerId ? Number(this.selectedPartnerId) : undefined;

    this.documentService.update(this.docId, updatePayload, partnerId).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.toastService.success('Saved', 'Document metadata updated successfully.');
          this.saved.emit();
        } else {
          this.toastService.error('Save failed', res.message || 'Could not save modifications.');
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toastService.error('Error', err.error?.message || 'Error occurred while saving modifications.');
      }
    });
  }

  onCancel() {
    if (this.saving() || this.reprocessing()) return;
    this.cancel.emit();
  }
}
