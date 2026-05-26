import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TempDocumentService } from '../../../core/services/temp-document.service';
import { DocumentService } from '../../../core/services/document.service';
import { DocTypeService, DocTypeDto } from '../../../core/services/doctype.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface UploadItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  errorMessage?: string;
}

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="header-title-wrap">
            <h3>{{ 'dms.upload_btn' | translate }}</h3>
            @if (companyId) {
              <div class="upload-stepper">
                <span class="step" [class.active]="requiresDocTypeSelection()">1/2 Entity & Folder</span>
                <span class="step-divider"></span>
                <span class="step" [class.active]="!requiresDocTypeSelection() || selectedDocTypeId">2/2 Upload & OCR</span>
              </div>
            }
          </div>
          <button class="btn-close" (click)="onClose()" [disabled]="uploading()">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
              <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          @if (companyId) {
            <div class="context-banner">
              <div class="context-label">Target</div>
              <div class="context-values">
                <span class="context-chip">Entity #{{ companyId }}</span>
                @if (companyName) {
                  <span class="context-chip">{{ companyName }}</span>
                }
                @if (docTypeId) {
                  <span class="context-chip context-chip-primary">Folder #{{ docTypeId }}<span class="context-chip-text">{{ docTypeName || '' }}</span></span>
                } @else {
                  <span class="context-chip context-chip-warning">Folder required before upload</span>
                }
              </div>
            </div>

            @if (!docTypeId) {
              <div class="form-group folder-selector-group">
                <label class="form-label" for="doctype-select">Select destination folder</label>
                @if (loadingContext()) {
                  <div class="context-loading">Loading folders...</div>
                } @else {
                  <select id="doctype-select" class="form-control"
                          [ngModel]="selectedDocTypeId"
                          (ngModelChange)="selectedDocTypeId = $event">
                    <option [ngValue]="null">-- Choose a folder --</option>
                    @for (docType of availableDocTypes(); track docType.id) {
                      <option [ngValue]="docType.id">{{ docType.name }}</option>
                    }
                  </select>
                  @if (availableDocTypes().length === 0) {
                    <span class="error-text">No folders are assigned to this entity.</span>
                  }
                }
              </div>
            }
          }

          <!-- Drag and Drop Zone -->
          <div class="drop-zone" 
               [class.drop-zone-active]="dragActive()"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave($event)"
               (drop)="onDrop($event)"
               (click)="fileInput.click()">
            
            <svg xmlns="http://www.w3.org/2000/svg" height="40" viewBox="0 -960 960 960" width="40" fill="var(--primary)">
              <path d="M440-320h80v-166l64 62 56-56-160-160-160 160 56 56 64-62v166Zm40 240q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q167 0 283.5-116.5T800-480q0-167-116.5-283.5T480-800q-167 0-283.5 116.5T200-480q0 167 116.5 283.5T480-160Zm0-320Z"/>
            </svg>
            <p class="drop-text-main">Drag & Drop files here or click to browse</p>
            <p class="drop-text-sub">Supported formats: PDF, PNG, JPG, TIFF, BMP, WEBP, DOCX, XLSX (Max 20MB)</p>
            
            <input #fileInput type="file" multiple (change)="onFileSelected($event)" style="display: none;">
          </div>

          <!-- Selected Files List -->
          @if (items().length > 0) {
            <div class="file-list-container">
              <h4 class="list-title">Selected Files ({{ items().length }})</h4>
              <ul class="file-list">
                @for (item of items(); track item.file.name; let idx = $index) {
                  <li class="file-item">
                    <div class="file-info">
                      <span class="file-name" [title]="item.file.name">{{ item.file.name }}</span>
                      <span class="file-size">{{ formatSize(item.file.size) }}</span>
                    </div>

                    <div class="file-status-wrapper">
                      <!-- Progress bar or text status -->
                      @if (item.status === 'uploading') {
                        <div class="progress-bar-container">
                          <div class="progress-bar" [style.width.%]="item.progress"></div>
                        </div>
                      } @else if (item.status === 'completed') {
                        <span class="status-badge badge-success">Completed</span>
                      } @else if (item.status === 'failed') {
                        <span class="status-badge badge-danger" [title]="item.errorMessage || 'Failed'">Failed</span>
                      } @else {
                        <span class="status-badge">Pending</span>
                      }
                      
                      <!-- Remove button (only if not uploading) -->
                      @if (item.status !== 'uploading' && !uploading()) {
                        <button class="btn-remove" (click)="removeItem(idx)" aria-label="Remove">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                          </svg>
                        </button>
                      }
                    </div>
                  </li>
                }
              </ul>
            </div>
          }
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onClose()" [disabled]="uploading()">Cancel</button>
          <button class="btn btn-primary" 
                  [disabled]="items().length === 0 || uploading() || (companyId && !effectiveDocTypeId())" 
                  (click)="startUpload()">
            @if (uploading()) {
              <span>Uploading...</span>
            } @else if (companyId && !effectiveDocTypeId()) {
              <span>Select folder to continue</span>
            } @else {
              <span>Start Upload</span>
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
      max-width: 600px;
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
    .header-title-wrap { display:flex; flex-direction:column; gap:6px; }
    .upload-stepper { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .step { font-size:0.75rem; color:var(--text-muted); background:var(--bg-primary); padding:4px 8px; border-radius:999px; }
    .step.active { background:var(--primary); color:#fff; font-weight:600; }
    .step-divider { width:20px; height:2px; background:var(--border-color); border-radius:2px; }
    .modal-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
    }
    .btn-close {
      cursor: pointer;
      color: var(--text-muted);
      transition: color var(--transition-fast);
      display: flex;
      align-items: center;
      background: none;
      border: none;
    }
    .btn-close:hover:not(:disabled) {
      color: var(--text-primary);
    }
    .btn-close:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .modal-body {
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .context-banner {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      background: var(--bg-secondary);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .context-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .context-values { display:flex; flex-wrap:wrap; gap:8px; }
    .context-chip { padding:4px 8px; border-radius:999px; background:var(--bg-primary); border:1px solid var(--border-color); font-size:0.8rem; color:var(--text-secondary); }
    .context-chip-primary { background: var(--primary-light); color: var(--primary); }
    .context-chip-warning { background: var(--warning-light); color: var(--warning, #b45309); }
    .context-chip-text { margin-left:6px; opacity:0.8; }
    .folder-selector-group { margin-top: -4px; }
    .context-loading { font-size: 0.85rem; color: var(--text-secondary); padding: 8px 0; }
    .drop-zone {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-lg);
      padding: 32px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      cursor: pointer;
      text-align: center;
      background-color: var(--bg-tertiary);
      transition: border-color var(--transition-normal), background-color var(--transition-normal);
    }
    .drop-zone:hover {
      border-color: var(--primary);
      background-color: var(--primary-light);
    }
    .drop-zone-active {
      border-color: var(--primary);
      background-color: var(--primary-light);
      box-shadow: 0 0 0 4px rgba(0, 120, 212, 0.1);
    }
    .drop-text-main {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 1rem;
    }
    .drop-text-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
      max-width: 420px;
      line-height: 1.4;
    }
    .file-list-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .list-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .file-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 180px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 6px;
      background-color: var(--bg-secondary);
    }
    .file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      border-bottom: 1px solid var(--border-color);
      font-size: 0.9rem;
      gap: 16px;
    }
    .file-item:last-child {
      border-bottom: none;
    }
    .file-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .file-name {
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-size {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .file-status-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 120px;
      justify-content: flex-end;
    }
    .status-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      background-color: var(--bg-primary);
      color: var(--text-secondary);
    }
    .status-badge.badge-success {
      background-color: var(--success-light);
      color: var(--success);
    }
    .status-badge.badge-danger {
      background-color: var(--error-light);
      color: var(--error);
      max-width: 80px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .progress-bar-container {
      width: 80px;
      height: 6px;
      background-color: var(--border-color);
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background-color: var(--primary);
      transition: width var(--transition-fast);
    }
    .btn-remove {
      color: var(--text-muted);
      cursor: pointer;
      transition: color var(--transition-fast);
      padding: 2px;
      display: inline-flex;
      border-radius: var(--radius-sm);
    }
    .btn-remove:hover {
      color: var(--error);
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
export class UploadModalComponent {
  @Input() companyId?: number;
  @Input() docTypeId?: number;
  @Input() companyName = '';
  @Input() docTypeName = '';

  @Output() uploaded = new EventEmitter<number[]>();
  @Output() cancel = new EventEmitter<void>();

  private readonly tempDocumentService = inject(TempDocumentService);
  private readonly documentService = inject(DocumentService);
  private readonly docTypeService = inject(DocTypeService);
  private readonly toastService = inject(ToastService);

  items = signal<UploadItem[]>([]);
  dragActive = signal(false);
  uploading = signal(false);
  private uploadedIds: number[] = [];
  availableDocTypes = signal<DocTypeDto[]>([]);
  loadingContext = signal(false);
  selectedDocTypeId: number | null = null;

  // Supported extensions
  private readonly allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp', 'webp', 'docx', 'xlsx'];
  private readonly maxFileSize = 20 * 1024 * 1024; // 20MB

  ngOnInit() {
    if (this.companyId && !this.docTypeId) {
      this.loadAvailableDocTypes();
    }
  }

  effectiveDocTypeId(): number | null {
    return this.docTypeId ?? this.selectedDocTypeId;
  }

  requiresDocTypeSelection(): boolean {
    return !!this.companyId && !this.docTypeId && !this.selectedDocTypeId;
  }

  private loadAvailableDocTypes() {
    if (!this.companyId) return;

    this.loadingContext.set(true);
    this.docTypeService.getAll().subscribe({
      next: (res) => {
        const docTypes = res.success ? (res.data || []) as DocTypeDto[] : [];
        // Fetch assigned entities per docType and filter by current company
        const requests = docTypes.map(docType => this.docTypeService.getAssignedEntities(docType.id!));
        if (requests.length === 0) {
          this.availableDocTypes.set([]);
          this.loadingContext.set(false);
          return;
        }
        forkJoin(requests).subscribe({
          next: (assignedList) => {
            const filtered = docTypes.filter((docType, index) => {
              const assigned = assignedList[index];
              const ids = assigned.success ? (assigned.data || []).map((entity: any) => entity.id) : [];
              return ids.includes(this.companyId!);
            });
            this.availableDocTypes.set(filtered);
            this.loadingContext.set(false);
          },
          error: () => {
            this.availableDocTypes.set([]);
            this.loadingContext.set(false);
          }
        });
      },
      error: () => {
        this.availableDocTypes.set([]);
        this.loadingContext.set(false);
      }
    });
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragActive.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragActive.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragActive.set(false);

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.handleFiles(e.dataTransfer.files);
    }
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(input.files);
    }
  }

  private handleFiles(files: FileList) {
    if (this.uploading()) return;

    const currentItems = [...this.items()];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = file.name.split('.').pop()?.toLowerCase() || '';

      // Validation
      if (!this.allowedExtensions.includes(extension)) {
        this.toastService.warning('Unsupported format', `File "${file.name}" format is not supported.`);
        continue;
      }
      if (file.size > this.maxFileSize) {
        this.toastService.warning('File too large', `File "${file.name}" exceeds the 20MB limit.`);
        continue;
      }

      // Check duplicate
      const duplicate = currentItems.some(item => item.file.name === file.name && item.file.size === file.size);
      if (duplicate) continue;

      currentItems.push({
        file,
        progress: 0,
        status: 'pending'
      });
    }

    this.items.set(currentItems);
  }

  removeItem(index: number) {
    this.items.update(items => items.filter((_, i) => i !== index));
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  startUpload() {
    const itemsToUpload = this.items().filter(item => item.status === 'pending' || item.status === 'failed');
    if (itemsToUpload.length === 0) return;

    if (this.companyId && !this.effectiveDocTypeId()) {
      this.toastService.warning('Missing folder', 'Please choose a folder before uploading.');
      return;
    }

    this.uploading.set(true);
    this.uploadNext(0, itemsToUpload);
  }

  private uploadNext(index: number, list: UploadItem[]) {
    if (index >= list.length) {
      // Done uploading all
      this.uploading.set(false);
      const failedCount = this.items().filter(item => item.status === 'failed').length;
      if (failedCount === 0) {
        this.toastService.success('Success', 'All files uploaded successfully.');
        this.uploaded.emit(this.uploadedIds);
      } else {
        this.toastService.warning('Upload complete', `${list.length - failedCount} files uploaded, ${failedCount} failed.`);
        this.uploaded.emit(this.uploadedIds);
      }
      return;
    }

    const item = list[index];
    item.status = 'uploading';
    item.progress = 30; // Mock progress start
    this.items.update(items => [...items]);

    // Choose upload service
    const folderId = this.effectiveDocTypeId();
    const upload$ = (this.companyId && folderId) 
      ? this.documentService.upload(item.file, this.companyId, folderId)
      : this.tempDocumentService.upload(item.file);

    upload$.subscribe({
      next: (res) => {
        if (res.success) {
          item.progress = 100;
          item.status = 'completed';
          const createdId = res.data?.id;
          if (createdId) this.uploadedIds.push(createdId);
        } else {
          item.status = 'failed';
          item.errorMessage = res.message;
          this.toastService.error('Upload failed', `Failed to upload "${item.file.name}".`);
        }
        this.items.update(items => [...items]);
        this.uploadNext(index + 1, list);
      },
      error: (err) => {
        item.status = 'failed';
        item.errorMessage = err.error?.message || 'Network error';
        this.toastService.error('Upload error', `Error uploading "${item.file.name}".`);
        this.items.update(items => [...items]);
        this.uploadNext(index + 1, list);
      }
    });
  }

  onClose() {
    if (this.uploading()) return;
    this.cancel.emit();
  }
}
