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
              <h4 class="section-title">{{ 'dms.ocr_meta' | translate }}</h4>

              <div class="form-group">
                <label class="form-label" for="document-name">Document name</label>
                <input type="text" id="document-name" class="form-control" [(ngModel)]="documentName">
              </div>
              
              <div class="form-row">
                <!-- Invoice Number -->
                <div class="form-group col-6">
                  <label class="form-label" for="invoice-number">{{ 'dms.invoice_num' | translate }}</label>
                  <input type="text" id="invoice-number" class="form-control" [(ngModel)]="invoiceNumber">
                </div>

                <!-- Currency -->
                <div class="form-group col-6">
                  <label class="form-label" for="invoice-currency">Currency</label>
                  <input type="text" id="invoice-currency" class="form-control" [(ngModel)]="currency" placeholder="EUR, USD, MAD">
                </div>
              </div>

              <div class="form-row">
                <!-- Document Date -->
                <div class="form-group col-6">
                  <label class="form-label" for="invoice-date">{{ 'dms.invoice_date' | translate }}</label>
                  <input type="date" id="invoice-date" class="form-control" [(ngModel)]="documentDate">
                </div>

                <!-- Due Date -->
                <div class="form-group col-6">
                  <label class="form-label" for="invoice-duedate">Due Date</label>
                  <input type="date" id="invoice-duedate" class="form-control" [(ngModel)]="dueDate">
                </div>
              </div>

              <!-- Partner/Vendor Selection -->
              <div class="form-group">
                <label class="form-label" for="invoice-partner">{{ 'dms.vendor' | translate }}</label>
                <select id="invoice-partner" class="form-control" [(ngModel)]="selectedPartnerId">
                  <option [ngValue]="null">-- Select Vendor/Partner --</option>
                  @for (partner of partners(); track partner.id) {
                    <option [ngValue]="partner.id">{{ partner.companyName }}</option>
                  }
                </select>
              </div>

              <div class="form-row text-fields">
                <!-- Total HT -->
                <div class="form-group col-4">
                  <label class="form-label" for="amount-ht">{{ 'dms.amount_ht' | translate }}</label>
                  <input type="number" step="0.01" id="amount-ht" class="form-control" [(ngModel)]="totalHt" (input)="recalculateTtc()">
                </div>

                <!-- VAT Amount -->
                <div class="form-group col-4">
                  <label class="form-label" for="amount-tva">{{ 'dms.amount_tva' | translate }}</label>
                  <input type="number" step="0.01" id="amount-tva" class="form-control" [(ngModel)]="tva" (input)="recalculateTtc()">
                </div>

                <!-- Total TTC -->
                <div class="form-group col-4">
                  <label class="form-label" for="amount-ttc">{{ 'dms.amount_ttc' | translate }}</label>
                  <input type="number" step="0.01" id="amount-ttc" class="form-control" [(ngModel)]="totalTtc">
                </div>
              </div>

              <!-- Line Items Grid -->
              <div class="line-items-section">
                <div class="line-items-header">
                  <h5>{{ 'dms.line_items' | translate }}</h5>
                  <button type="button" class="btn btn-secondary btn-xs" (click)="addLineItem()">+ Add Item</button>
                </div>
                
                <div class="line-items-table-container">
                  <table class="line-items-table">
                    <thead>
                      <tr>
                        <th>{{ 'dms.description' | translate }}</th>
                        <th style="width: 80px;">{{ 'dms.quantity' | translate }}</th>
                        <th style="width: 100px;">{{ 'dms.unit_price' | translate }}</th>
                        <th style="width: 100px;">{{ 'dms.total' | translate }}</th>
                        <th style="width: 50px;"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of lineItems(); track $index; let idx = $index) {
                        <tr>
                          <td>
                            <input type="text" class="table-input" [(ngModel)]="item.description">
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
                                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/>
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
      invoiceNumber: this.invoiceNumber,
      currency: this.currency,
      totalHt: Number(this.totalHt),
      tva: Number(this.tva),
      totalTtc: Number(this.totalTtc),
      documentDate: this.documentDate ? `${this.documentDate}T00:00:00` : undefined,
      dueDate: this.dueDate ? `${this.dueDate}T00:00:00` : undefined,
      extractedData: {
        line_items: this.lineItems()
      }
    };

    const partnerId = this.selectedPartnerId ? Number(this.selectedPartnerId) : undefined;

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
