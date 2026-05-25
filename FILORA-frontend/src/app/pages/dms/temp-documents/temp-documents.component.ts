import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TempDocumentService, TempDocumentDto } from '../../../core/services/temp-document.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UploadModalComponent } from '../../../shared/components/upload-modal/upload-modal.component';
import { PromoteModalComponent } from '../../../shared/components/promote-modal/promote-modal.component';
import { OcrReviewModalComponent } from '../../../shared/components/ocr-review-modal/ocr-review-modal.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-temp-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    UploadModalComponent,
    PromoteModalComponent,
    OcrReviewModalComponent,
    // OCR Review modal to edit promoted document metadata
    // Loaded after promotion completes
    // Note: import component dynamically below as needed
    ConfirmDialogComponent
  ],
  template: `
    <div class="page-container animate-fade-in">
      <!-- Header -->
      <div class="page-header">
        <div class="header-title-section">
          <h1>{{ 'dms.temp_title' | translate }}</h1>
          <p class="subtitle">Manage raw files in the temporary upload zone before categorizing them.</p>
        </div>
        <button class="btn btn-primary" (click)="showUploadModal.set(true)">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
          </svg>
          <span>{{ 'dms.upload_btn' | translate }}</span>
        </button>
      </div>

      <!-- Toolbar / Filters -->
      <div class="toolbar glass-panel">
        <div class="search-box">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="var(--text-muted)">
            <path d="M784-120 533-371q-30 24-70.5 37.5T380-320q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 251-56 57ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
          </svg>
          <input type="text" 
                 class="search-input" 
                 [placeholder]="'dms.search_placeholder' | translate" 
                 [(ngModel)]="searchQuery">
        </div>

        <div class="toolbar-actions">
          @if (selectedIds().size > 0) {
            <button class="btn btn-danger btn-sm" (click)="triggerBulkDelete()">
              <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/>
              </svg>
              <span>{{ 'dms.bulk_delete' | translate }} ({{ selectedIds().size }})</span>
            </button>
          }
        </div>
      </div>

      <!-- Main Documents Card -->
      <div class="card card-table glass-panel">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>{{ 'dms.loading' | translate }}</span>
          </div>
        } @else if (filteredDocuments().length === 0) {
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="var(--text-muted)">
              <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T680-80H240Zm280-570v-150H240v640h480v-490H520ZM240-800v150-150 640-640Z"/>
            </svg>
            <h3>{{ 'dms.empty' | translate }}</h3>
            <p>Upload new files to start classifying documents.</p>
            <button class="btn btn-secondary btn-sm" (click)="showUploadModal.set(true)">Upload Now</button>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;" class="text-center">#</th>
                  <th style="width: 48px;">
                    <label class="checkbox-container">
                      <input type="checkbox" 
                             [checked]="isAllSelected()" 
                             [indeterminate]="isPartiallySelected()"
                             (change)="toggleSelectAll()">
                      <span class="checkbox-checkmark"></span>
                    </label>
                  </th>
                  <th>{{ 'dms.file_name' | translate }}</th>
                  <th>Owner</th>
                  <th>{{ 'dms.upload_date' | translate }}</th>
                  <th>File type</th>
                  <th style="width: 120px;">Size</th>
                  <th style="width: 150px;" class="text-center">{{ 'dms.actions' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (doc of filteredDocuments(); track doc.id; let idx = $index) {
                  <tr [class.selected]="selectedIds().has(doc.id)">
                    <td class="text-center">{{ idx + 1 }}</td>
                    <td>
                      <label class="checkbox-container">
                        <input type="checkbox" 
                               [checked]="selectedIds().has(doc.id)"
                               (change)="toggleSelect(doc.id)">
                        <span class="checkbox-checkmark"></span>
                      </label>
                    </td>
                    <td>
                      <div class="file-name-cell">
                        <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="var(--primary)">
                          <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T680-80H240Zm280-570v-150H240v640h480v-490H520ZM240-800v150-150 640-640Z"/>
                        </svg>
                        <span class="file-title" [title]="doc.filename">{{ doc.filename }}</span>
                      </div>
                    </td>
                    <td><span class="user-badge">{{ doc.ownerName }}</span></td>
                    <td>{{ doc.createdAt | date:'short' }}</td>
                    <td>{{ doc.fileType || 'Unknown' }}</td>
                    <td>{{ formatSize(doc.fileSize) }}</td>
                    <td class="text-center">
                      <div class="actions-group">
                        <button class="action-btn btn-promote" 
                                [title]="'dms.promote_btn' | translate" 
                                (click)="promoteDoc(doc)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M647-80 500-227l56-56 91 91 201-201 56 56L647-80ZM240-200v-386l-57 57-56-56 153-153 153 153-56 56-57-57v386h-80Zm240-280v-320h80v320h-80Z"/>
                          </svg>
                        </button>
                        <button class="action-btn btn-delete" 
                                [title]="'dms.delete_btn' | translate" 
                                (click)="deleteDoc(doc)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <!-- Modals -->
    @if (showUploadModal()) {
      <app-upload-modal
        (uploaded)="onUploadComplete()"
        (cancel)="showUploadModal.set(false)">
      </app-upload-modal>
    }

    @if (activePromoteId()) {
      <app-promote-modal
        [tempDocId]="activePromoteId()!"
        [docName]="activePromoteName()"
        (promoted)="onPromoteComplete($event)"
        (cancel)="activePromoteId.set(null)">
      </app-promote-modal>
    }

    @if (activeOcrReviewId()) {
      <app-ocr-review-modal
        [docId]="activeOcrReviewId()!"
        [docName]="activeOcrReviewName()"
        (saved)="onOcrReviewComplete()"
        (cancel)="activeOcrReviewId.set(null)">
      </app-ocr-review-modal>
    }

    @if (showConfirmDeleteDialog()) {
      <app-confirm-dialog
        title="Delete Document"
        [message]="deleteDialogMessage()"
        confirmText="Delete"
        (confirm)="onConfirmDelete()"
        (cancel)="cancelDelete()">
      </app-confirm-dialog>
    }
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
      flex: 1;
      min-height: 0;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .header-title-section h1 {
      font-size: 1.25rem;
      margin-bottom: 4px;
    }
    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
    .toolbar {
      padding: 8px 12px;
      border-radius: var(--radius-md);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      flex: 1;
      max-width: 400px;
      min-width: 250px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 8px 12px 8px 40px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background-color: var(--bg-secondary);
      font-size: 0.9rem;
      color: var(--text-primary);
    }
    .search-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .card-table {
      padding: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .table-container {
      width: 100%;
      overflow: auto;
      flex: 1;
      min-height: 0;
    }

    .table-container .data-table thead th { position: sticky; top: 0; z-index: 6; background-color: var(--bg-secondary); }
    .file-name-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 320px;
    }
    .file-icon {
      flex-shrink: 0;
    }
    .file-title {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-badge {
      background-color: var(--bg-primary);
      padding: 3px 8px;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
    }
    .actions-group {
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      transition: all var(--transition-fast);
      display: inline-flex;
    }
    .action-btn:hover {
      background-color: var(--bg-primary);
    }
    .btn-promote:hover {
      color: var(--primary);
    }
    .btn-delete:hover {
      color: var(--error);
      background-color: var(--error-light);
    }
    
    .loading-state, .empty-state {
      padding: 60px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: var(--text-secondary);
      gap: 16px;
    }
    .loading-state span {
      font-weight: 500;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border-color);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .empty-state h3 {
      font-size: 1.25rem;
      color: var(--text-primary);
      margin-top: 8px;
    }
    .empty-state p {
      max-width: 320px;
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    /* Checkbox styles matching custom feel */
    .checkbox-container {
      display: inline-flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      user-select: none;
    }
    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }
    .checkbox-checkmark {
      position: relative;
      height: 18px;
      width: 18px;
      background-color: var(--bg-secondary);
      border: 2px solid var(--text-muted);
      border-radius: 4px;
      transition: all var(--transition-fast);
    }
    .checkbox-container:hover input ~ .checkbox-checkmark {
      border-color: var(--primary);
    }
    .checkbox-container input:checked ~ .checkbox-checkmark {
      background-color: var(--primary);
      border-color: var(--primary);
    }
    .checkbox-container input:indeterminate ~ .checkbox-checkmark {
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
    .checkbox-container input:indeterminate ~ .checkbox-checkmark:after {
      display: block;
      left: 4px;
      top: 6px;
      width: 6px;
      height: 2px;
      background-color: white;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.85rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .animate-fade-in {
      animation: fade-in 0.25s ease-out forwards;
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Row highlight when checked */
    tr.selected td {
      background-color: var(--primary-light);
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }
      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }
      .search-box {
        max-width: 100%;
      }
      .actions-group {
        flex-direction: column;
        gap: 4px;
      }
    }
  `]
})
export class TempDocumentsComponent implements OnInit {
  private readonly tempDocService = inject(TempDocumentService);
  private readonly toastService = inject(ToastService);

  documents = signal<TempDocumentDto[]>([]);
  loading = signal(true);
  searchQuery = '';

  // Modals visibility triggers
  showUploadModal = signal(false);
  activePromoteId = signal<number | null>(null);
  activePromoteName = signal('');
  // Open OCR review modal for the promoted document
  activeOcrReviewId = signal<number | null>(null);
  activeOcrReviewName = signal('');
  
  // Delete dialog signals
  showConfirmDeleteDialog = signal(false);
  private docToDelete = signal<TempDocumentDto | null>(null);
  private isBulkDelete = signal(false);

  // Selected row tracking
  selectedIds = signal<Set<number>>(new Set());

  // Filtered documents computed reactively
  filteredDocuments = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();
    const list = this.documents();
    if (!query) return list;
    return list.filter(d => 
      d.filename.toLowerCase().includes(query) || 
      d.ownerName.toLowerCase().includes(query)
    );
  });

  // Checkbox helpers
  isAllSelected = computed(() => {
    const list = this.filteredDocuments();
    if (list.length === 0) return false;
    return list.every(d => this.selectedIds().has(d.id));
  });

  isPartiallySelected = computed(() => {
    const list = this.filteredDocuments();
    if (list.length === 0) return false;
    const selectedCount = list.filter(d => this.selectedIds().has(d.id)).length;
    return selectedCount > 0 && selectedCount < list.length;
  });

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.loading.set(true);
    this.tempDocService.getTempDocuments().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.documents.set(res.data || []);
          // Clear selections that might no longer exist
          const existingIds = new Set(this.documents().map(d => d.id));
          this.selectedIds.update(current => {
            const next = new Set<number>();
            current.forEach(id => {
              if (existingIds.has(id)) next.add(id);
            });
            return next;
          });
        } else {
          this.toastService.error('Error', res.message || 'Failed to fetch temporary documents.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toastService.error('Network Error', err.error?.message || 'Could not load temporary files.');
      }
    });
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Row Selection logic
  toggleSelect(id: number) {
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  toggleSelectAll() {
    const list = this.filteredDocuments();
    this.selectedIds.update(current => {
      const next = new Set(current);
      const allSelected = list.every(d => next.has(d.id));
      if (allSelected) {
        // Deselect all in filtered view
        list.forEach(d => next.delete(d.id));
      } else {
        // Select all in filtered view
        list.forEach(d => next.add(d.id));
      }
      return next;
    });
  }

  // Operations
  promoteDoc(doc: TempDocumentDto) {
    this.activePromoteName.set(doc.filename);
    this.activePromoteId.set(doc.id);
  }
  
  onPromoteComplete(promotedDocId?: number) {
    // Close promote modal
    const promotedId = promotedDocId ?? null;
    // Clear promote modal state
    const tempId = this.activePromoteId();
    this.activePromoteId.set(null);
    // Remove temp doc from selection if present
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (tempId) next.delete(tempId);
      return next;
    });

    // Refresh temp list
    this.loadDocuments();

    // If backend returned promoted document id, open OCR review modal
    if (promotedId) {
      this.activeOcrReviewId.set(promotedId);
      // Use the promoted doc name for modal badge
      this.activeOcrReviewName.set(this.activePromoteName());
    }
  }

  onUploadComplete() {
    this.showUploadModal.set(false);
    this.loadDocuments();
  }

  onOcrReviewComplete() {
    this.activeOcrReviewId.set(null);
    this.loadDocuments();
  }

  // Deletion logic
  deleteDoc(doc: TempDocumentDto) {
    this.isBulkDelete.set(false);
    this.docToDelete.set(doc);
    this.showConfirmDeleteDialog.set(true);
  }

  triggerBulkDelete() {
    this.isBulkDelete.set(true);
    this.docToDelete.set(null);
    this.showConfirmDeleteDialog.set(true);
  }

  deleteDialogMessage(): string {
    if (this.isBulkDelete()) {
      return `Are you sure you want to delete the ${this.selectedIds().size} selected temporary documents?`;
    }
    return `Are you sure you want to delete "${this.docToDelete()?.filename}"?`;
  }

  onConfirmDelete() {
    this.showConfirmDeleteDialog.set(false);
    this.loading.set(true);

    if (this.isBulkDelete()) {
      const ids = Array.from(this.selectedIds());
      // Delete temporary documents sequentially since backend lacks bulk endpoint
      const deleteRequests = ids.map(id => 
        this.tempDocService.delete(id).pipe(
          catchError(err => of({ success: false, id, message: err.error?.message }))
        )
      );

      forkJoin(deleteRequests).subscribe({
        next: (results) => {
          const failures = results.filter(r => !r.success);
          if (failures.length === 0) {
            this.toastService.success('Deletions Complete', 'All selected files were deleted.');
          } else {
            this.toastService.warning(
              'Deletions Partially Completed', 
              `${ids.length - failures.length} deleted, ${failures.length} failed.`
            );
          }
          this.selectedIds.set(new Set());
          this.loadDocuments();
        },
        error: () => {
          this.toastService.error('Error', 'Bulk deletion process failed.');
          this.loadDocuments();
        }
      });
    } else {
      const doc = this.docToDelete();
      if (!doc) return;

      this.tempDocService.delete(doc.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.success('Deleted', `File "${doc.filename}" has been removed.`);
            this.selectedIds.update(current => {
              const next = new Set(current);
              next.delete(doc.id);
              return next;
            });
            this.loadDocuments();
          } else {
            this.toastService.error('Delete Failed', res.message || 'Could not delete temporary document.');
            this.loading.set(false);
          }
        },
        error: (err) => {
          this.toastService.error('Error', err.error?.message || 'Error occurred while deleting file.');
          this.loading.set(false);
        }
      });
    }
  }

  cancelDelete() {
    this.showConfirmDeleteDialog.set(false);
    this.docToDelete.set(null);
  }
}
