import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DocumentService, DocumentDto } from '../../../core/services/document.service';
import { EntityService } from '../../../core/services/entity.service';
import { DocTypeService } from '../../../core/services/doctype.service';
import { PartnerService, PartnerDto } from '../../../core/services/partner.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UploadModalComponent } from '../../../shared/components/upload-modal/upload-modal.component';
import { ShareModalComponent } from '../../../shared/components/share-modal/share-modal.component';
import { OcrReviewModalComponent } from '../../../shared/components/ocr-review-modal/ocr-review-modal.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import JSZip from 'jszip';

@Component({
  selector: 'app-entity-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    UploadModalComponent,
    ShareModalComponent,
    OcrReviewModalComponent,
    ConfirmDialogComponent
  ],
  template: `
    <div class="page-container animate-fade-in">
      <!-- Header -->
      <div class="page-header">
        <div class="header-title-section">
          <div class="breadcrumbs">
            <span class="company-crumb">{{ companyName() }}</span>
            <span class="crumb-separator">/</span>
            <span class="folder-crumb">{{ docTypeName() }}</span>
          </div>
          <h1>Documents</h1>
        </div>
        
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="toggleFilters()">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
              <path d="M440-160v-320L160-760h640L520-480v320H440Zm40-366 195-234H285l195 234Zm0 0Z"/>
            </svg>
            <span>Filters</span>
            @if (activeFilterCount() > 0) {
              <span class="filter-badge">{{ activeFilterCount() }}</span>
            }
          </button>
          <button class="btn btn-primary" (click)="showUploadModal.set(true)">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
              <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
            </svg>
            <span>Upload File</span>
          </button>
        </div>
      </div>

      <!-- Collapsible Interactive Filter Panel -->
      @if (filtersVisible()) {
        <div class="filter-panel glass-panel animate-slide-down">
          <div class="filter-grid">
            <!-- OCR Status -->
            <div class="form-group">
              <label class="form-label">OCR Status</label>
              <select class="form-control" [(ngModel)]="filterOcrStatus">
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <!-- Partner / Vendor -->
            <div class="form-group">
              <label class="form-label">Vendor / Partner</label>
              <select class="form-control" [(ngModel)]="filterPartner">
                <option value="ALL">All Partners</option>
                @for (p of partners(); track p.id) {
                  <option [value]="p.companyName">{{ p.companyName }}</option>
                }
              </select>
            </div>

            <!-- Date Range Start -->
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input type="date" class="form-control" [(ngModel)]="filterStartDate">
            </div>

            <!-- Date Range End -->
            <div class="form-group">
              <label class="form-label">End Date</label>
              <input type="date" class="form-control" [(ngModel)]="filterEndDate">
            </div>

            <!-- Min Amount -->
            <div class="form-group">
              <label class="form-label">Min Amount (TTC)</label>
              <input type="number" class="form-control" [(ngModel)]="filterMinAmount" placeholder="Min">
            </div>

            <!-- Max Amount -->
            <div class="form-group">
              <label class="form-label">Max Amount (TTC)</label>
              <input type="number" class="form-control" [(ngModel)]="filterMaxAmount" placeholder="Max">
            </div>

            <!-- Is Invoice Toggle -->
            <div class="form-group">
              <label class="form-label">Document Category</label>
              <select class="form-control" [(ngModel)]="filterInvoiceType">
                <option value="ALL">All Documents</option>
                <option value="INVOICES">Invoices Only</option>
                <option value="OTHERS">Non-Invoices</option>
              </select>
            </div>

            <!-- Filter Actions -->
            <div class="form-group filter-actions-cell">
              <button class="btn btn-secondary btn-sm" (click)="resetFilters()">Clear Filters</button>
            </div>
          </div>
        </div>
      }

      <!-- Search and Bulk Actions Toolbar -->
      <div class="toolbar glass-panel">
        <div class="search-box">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="var(--text-muted)">
            <path d="M784-120 533-371q-30 24-70.5 37.5T380-320q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 251-56 57ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
          </svg>
          <input type="text" 
                 class="search-input" 
                 [placeholder]="'dms.search_placeholder' | translate" 
                 [(ngModel)]="searchQuery"
                 (keyup.enter)="triggerBackendSearch()">
        </div>

        <div class="toolbar-actions">
          @if (selectedIds().size > 0) {
            <button class="btn btn-secondary btn-sm" (click)="compileZip()" [disabled]="compilingZip()">
              @if (compilingZip()) {
                <div class="spinner-xs"></div>
                <span>Compiling...</span>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                  <path d="M480-320 280-520l56-56 104 104v-328h80v328l104-104 56 56-200 200ZM240-160q-33 0-56.5-23.5T160-200v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                </svg>
                <span>Compile ZIP</span>
              }
            </button>
            <button class="btn btn-secondary btn-sm" (click)="triggerBulkShare()">
              <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                <path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5t-38-23.5L322-568q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"/>
              </svg>
              <span>Share Selected</span>
            </button>
            <button class="btn btn-danger btn-sm" (click)="triggerBulkDelete()">
              <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/>
              </svg>
              <span>Delete ({{ selectedIds().size }})</span>
            </button>
          }
        </div>
      </div>

      <!-- Main Documents Table Card -->
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
            <h3>No documents found</h3>
            <p>Try refining your search query or uploading new files.</p>
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
                  @if (!doctypeId) {
                    <th>DocType</th>
                  }
                  <th>Partner</th>
                  <th>Invoice?</th>
                  <th>HT</th>
                  <th>TVA</th>
                  <th>TTC</th>
                  <th>Doc Date</th>
                  <th>Due Date</th>
                  <th>OCR Status</th>
                  <th>Owner</th>
                  <th style="width: 220px;" class="text-center">{{ 'dms.actions' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (doc of filteredDocuments(); track doc.id; let idx = $index) {
                  <tr [class.selected]="selectedIds().has(doc.id)"
                      [class.overdue]="hasDocumentIssue(doc)">
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
                        <div class="file-meta-wrapper">
                          <span class="file-title" [title]="doc.filename">{{ doc.filename }}</span>
                          <span class="file-subtext">{{ formatSize(doc.fileSize) }}</span>
                        </div>
                      </div>
                    </td>
                    @if (!doctypeId) {
                      <td>{{ doc.docTypeName || '—' }}</td>
                    }
                    <td>
                      @if (doc.partnerName) {
                        <span class="partner-text">{{ doc.partnerName }}</span>
                      } @else {
                        <span class="text-muted italic">—</span>
                      }
                    </td>
                    <td class="text-center">
                      <span class="badge" [class]="doc.isInvoice ? 'badge-info' : 'badge-secondary'">
                        {{ doc.isInvoice ? 'Yes' : 'No' }}
                      </span>
                    </td>
                    <td [class.facturable-cell]="doc.isInvoice" class="text-bold">
                      @if (doc.isInvoice && doc.totalHt !== undefined && doc.totalHt !== null) {
                        {{ doc.totalHt | number:'1.2-2' }} {{ doc.currency || 'TND' }}
                      } @else {
                        —
                      }
                    </td>
                    <td [class.facturable-cell]="doc.isInvoice" class="text-bold">
                      @if (doc.isInvoice && doc.tva !== undefined && doc.tva !== null) {
                        {{ doc.tva | number:'1.2-2' }} {{ doc.currency || 'TND' }}
                      } @else {
                        —
                      }
                    </td>
                    <td [class.facturable-cell]="doc.isInvoice" class="text-bold">
                      @if (doc.isInvoice && doc.totalTtc !== undefined && doc.totalTtc !== null) {
                        {{ doc.totalTtc | number:'1.2-2' }} {{ doc.currency || 'TND' }}
                      } @else {
                        —
                      }
                    </td>
                    <td [class.facturable-cell]="doc.isInvoice">
                      {{ (doc.isInvoice && doc.documentDate ? (doc.documentDate | date:'mediumDate') : '') || '—' }}
                    </td>
                    <td [class.facturable-cell]="doc.isInvoice">
                      {{ (doc.isInvoice && doc.dueDate ? (doc.dueDate | date:'mediumDate') : '') || '—' }}
                    </td>
                    <td>
                      <span class="badge" [class]="getOcrBadgeClass(doc.ocrStatus)">
                        {{ doc.ocrStatus }}
                      </span>
                    </td>
                    <td><span class="user-badge">{{ doc.ownerName }}</span></td>
                    <td class="text-center">
                      <div class="actions-group">
                        <!-- OCR Review -->
                        <button class="action-btn btn-ocr" 
                                title="OCR Review" 
                                (click)="openOcrReview(doc)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M200-200h57l367-367-57-57-367 367v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                          </svg>
                        </button>
                        
                        <!-- Share -->
                        <button class="action-btn btn-share" 
                                title="Share" 
                                (click)="openShareModal(doc)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5t-38-23.5L322-568q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"/>
                          </svg>
                        </button>
 
                        <!-- Download Dropdown Toggle -->
                        <div class="dropdown-wrapper">
                          <button class="action-btn btn-download" 
                                  title="Download Options" 
                                  (click)="toggleDownloadDropdown($event, doc.id)">
                            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                              <path d="M480-320 280-520l56-56 104 104v-328h80v328l104-104 56 56-200 200ZM240-160q-33 0-56.5-23.5T160-200v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                            </svg>
                          </button>
                          
                          @if (activeDropdownId() === doc.id) {
                            <div class="dropdown-menu glass-panel animate-scale-in">
                              <a class="dropdown-item" (click)="downloadOriginal(doc)">
                                <span>Original File</span>
                              </a>
                              <a class="dropdown-item" (click)="downloadMetadataJson(doc)">
                                <span>Metadata JSON</span>
                              </a>
                            </div>
                          }
                        </div>
 
                        <!-- Delete -->
                        <button class="action-btn btn-delete" 
                                title="Delete" 
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
        [companyId]="companyId"
        [docTypeId]="doctypeId"
        (uploaded)="onUploadComplete()"
        (cancel)="showUploadModal.set(false)">
      </app-upload-modal>
    }

    @if (activeShareId()) {
      <app-share-modal
        [docId]="activeShareId()!"
        [docName]="activeShareName()"
        (shared)="onShareComplete()"
        (cancel)="activeShareId.set(null)">
      </app-share-modal>
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
      margin-top: 0;
    }
    .breadcrumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted);
    }
    .company-crumb {
      color: var(--text-secondary);
    }
    .folder-crumb {
      color: var(--primary);
      font-weight: 600;
    }
    .crumb-separator {
      color: var(--text-muted);
    }
    .header-actions {
      display: flex;
      gap: 12px;
    }
    .filter-badge {
      background-color: var(--primary);
      color: white;
      border-radius: var(--radius-full);
      padding: 1px 6px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: 4px;
    }

    /* Collapsible Filter Panel */
    .filter-panel {
      padding: 18px;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      align-items: flex-end;
    }
    .filter-actions-cell {
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: flex-end;
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
      gap: 12px;
      max-width: 350px;
    }
    .file-meta-wrapper {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .file-title {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-primary);
    }
    .file-subtext {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .partner-text {
      font-weight: 500;
      color: var(--text-secondary);
    }
    .actions-group {
      display: flex;
      justify-content: center;
      gap: 6px;
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
    .btn-ocr:hover { color: var(--primary); }
    .btn-share:hover { color: var(--primary); }
    .btn-download:hover { color: var(--success); }
    .btn-delete:hover {
      color: var(--error);
      background-color: var(--error-light);
    }

    /* Dropdown wrapper for download options */
    .dropdown-wrapper {
      position: relative;
    }
    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 6px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 100;
      min-width: 140px;
      padding: 4px;
      display: flex;
      flex-direction: column;
    }
    .dropdown-item {
      padding: 8px 12px;
      font-size: 0.85rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--text-primary);
      text-align: left;
      transition: background-color var(--transition-fast);
    }
    .dropdown-item:hover {
      background-color: var(--bg-primary);
      color: var(--primary);
    }

    /* Checkboxes */
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
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border-color);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-xs {
      width: 14px;
      height: 14px;
      border: 2px solid var(--primary);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
      margin-right: 6px;
      vertical-align: middle;
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
    }

    .text-center { text-align: center; }
    .text-bold { font-weight: 600; }
    .italic { font-style: italic; }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .animate-fade-in {
      animation: fade-in 0.25s ease-out forwards;
    }
    .animate-slide-down {
      animation: slide-down 0.2s ease-out forwards;
    }
    .animate-scale-in {
      animation: scale-in 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
    }

    @keyframes fade-in {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slide-down {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scale-in {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

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
export class EntityDocumentsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly documentService = inject(DocumentService);
  private readonly entityService = inject(EntityService);
  private readonly docTypeService = inject(DocTypeService);
  private readonly partnerService = inject(PartnerService);
  private readonly toastService = inject(ToastService);

  companyId!: number;
  doctypeId!: number;

  companyName = signal('Loading Company...');
  docTypeName = signal('Loading Folder...');
  documents = signal<DocumentDto[]>([]);
  partners = signal<PartnerDto[]>([]);
  loading = signal(true);
  compilingZip = signal(false);

  // Search parameters
  searchQuery = '';

  // Interactive filters
  filtersVisible = signal(false);
  filterOcrStatus = 'ALL';
  filterPartner = 'ALL';
  filterStartDate = '';
  filterEndDate = '';
  filterMinAmount: number | null = null;
  filterMaxAmount: number | null = null;
  filterInvoiceType = 'ALL';

  // Modal control triggers
  showUploadModal = signal(false);
  activeShareId = signal<number | null>(null);
  activeShareName = signal('');
  activeOcrReviewId = signal<number | null>(null);
  activeOcrReviewName = signal('');

  // Dropdown states
  activeDropdownId = signal<number | null>(null);

  // Row Selection logic
  selectedIds = signal<Set<number>>(new Set());

  // Confirm delete dialog signals
  showConfirmDeleteDialog = signal(false);
  private docToDelete = signal<DocumentDto | null>(null);
  private isBulkDelete = signal(false);

  // Active filter count computed
  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filterOcrStatus !== 'ALL') count++;
    if (this.filterPartner !== 'ALL') count++;
    if (this.filterStartDate) count++;
    if (this.filterEndDate) count++;
    if (this.filterMinAmount !== null) count++;
    if (this.filterMaxAmount !== null) count++;
    if (this.filterInvoiceType !== 'ALL') count++;
    return count;
  });

  // Client-side filtering computed reactively
  filteredDocuments = computed(() => {
    let list = this.documents();

    // OCR Status Filter
    if (this.filterOcrStatus !== 'ALL') {
      list = list.filter(d => d.ocrStatus === this.filterOcrStatus);
    }

    // Partner / Vendor Filter
    if (this.filterPartner !== 'ALL') {
      list = list.filter(d => d.partnerName === this.filterPartner);
    }

    // Date Filters
    if (this.filterStartDate) {
      const start = new Date(this.filterStartDate);
      list = list.filter(d => d.documentDate && new Date(d.documentDate) >= start);
    }
    if (this.filterEndDate) {
      const end = new Date(this.filterEndDate);
      // Set to end of day to cover inclusive dates
      end.setHours(23, 59, 59, 999);
      list = list.filter(d => d.documentDate && new Date(d.documentDate) <= end);
    }

    // Amount Bounds (HT or TTC depending on what is set)
    if (this.filterMinAmount !== null) {
      list = list.filter(d => d.totalTtc !== undefined && d.totalTtc >= this.filterMinAmount!);
    }
    if (this.filterMaxAmount !== null) {
      list = list.filter(d => d.totalTtc !== undefined && d.totalTtc <= this.filterMaxAmount!);
    }

    // Category Filter
    if (this.filterInvoiceType === 'INVOICES') {
      list = list.filter(d => d.isInvoice === true);
    } else if (this.filterInvoiceType === 'OTHERS') {
      list = list.filter(d => d.isInvoice !== true);
    }

    return list;
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

  private routeSub!: Subscription;

  ngOnInit() {
    // Listen to route params change
    this.routeSub = this.route.paramMap.subscribe(params => {
      this.companyId = Number(params.get('companyId'));
      this.doctypeId = Number(params.get('doctypeId'));
      this.selectedIds.set(new Set());
      this.resetFilters();
      this.loadBreadcrumbs();
      this.loadDocuments();
    });

    // Close active dropdowns on global click
    window.addEventListener('click', this.closeDropdownGlobal);

    // Load partners list
    this.partnerService.getAll().subscribe(res => {
      if (res.success) {
        this.partners.set(res.data || []);
      }
    });
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
    window.removeEventListener('click', this.closeDropdownGlobal);
  }

  private closeDropdownGlobal = () => {
    this.activeDropdownId.set(null);
  };

  loadBreadcrumbs() {
    this.entityService.getById(this.companyId).subscribe(res => {
      if (res.success && res.data) {
        this.companyName.set(res.data.name);
      }
    });

    if (this.doctypeId) {
      this.docTypeService.getById(this.doctypeId).subscribe(res => {
        if (res.success && res.data) {
          this.docTypeName.set(res.data.name);
        }
      });
    } else {
      this.docTypeName.set('All Folders');
    }
  }

  loadDocuments() {
    this.loading.set(true);
    this.documentService.search({
      companyId: this.companyId,
      docTypeId: this.doctypeId ? this.doctypeId : undefined,
      query: this.searchQuery ? this.searchQuery : undefined,
      size: 200 // larger page size for easier client side interactive filtering
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          // Check backend API structure: Page is returned inside res.data
          // Page contains "content" array
          const content = res.data?.content || [];
          this.documents.set(content);
        } else {
          this.toastService.error('Error', res.message || 'Failed to search documents.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toastService.error('Network Error', err.error?.message || 'Could not load documents.');
      }
    });
  }

  triggerBackendSearch() {
    this.loadDocuments();
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
        list.forEach(d => next.delete(d.id));
      } else {
        list.forEach(d => next.add(d.id));
      }
      return next;
    });
  }

  toggleFilters() {
    this.filtersVisible.update(v => !v);
  }

  resetFilters() {
    this.filterOcrStatus = 'ALL';
    this.filterPartner = 'ALL';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterMinAmount = null;
    this.filterMaxAmount = null;
    this.filterInvoiceType = 'ALL';
  }

  getOcrBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'badge-success';
      case 'PENDING': return 'badge-info';
      case 'PROCESSING': return 'badge-warning';
      case 'FAILED': return 'badge-danger';
      default: return '';
    }
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Modals Complete Triggers
  onUploadComplete() {
    this.showUploadModal.set(false);
    this.loadDocuments();
  }

  openOcrReview(doc: DocumentDto) {
    this.activeOcrReviewName.set(doc.filename);
    this.activeOcrReviewId.set(doc.id);
  }

  onOcrReviewComplete() {
    this.activeOcrReviewId.set(null);
    this.loadDocuments();
  }

  openShareModal(doc: DocumentDto) {
    this.activeShareName.set(doc.filename);
    this.activeShareId.set(doc.id);
  }

  onShareComplete() {
    this.activeShareId.set(null);
  }

  // DownloadDropdown Actions
  toggleDownloadDropdown(event: Event, id: number) {
    event.stopPropagation();
    if (this.activeDropdownId() === id) {
      this.activeDropdownId.set(null);
    } else {
      this.activeDropdownId.set(id);
    }
  }

  downloadOriginal(doc: DocumentDto) {
    // Navigate directly to download link
    const url = this.documentService.getDownloadUrl(doc.id);
    window.open(url, '_blank');
  }

  downloadMetadataJson(doc: DocumentDto) {
    // Generate JSON containing all document metadata client-side
    const metadata = {
      id: doc.id,
      fileName: doc.filename,
      owner: doc.ownerName,
      ocrStatus: doc.ocrStatus,
      isInvoice: doc.isInvoice,
      invoiceNumber: doc.invoiceNumber,
      documentDate: doc.documentDate,
      dueDate: doc.dueDate,
      totalHt: doc.totalHt,
      tva: doc.tva,
      totalTtc: doc.totalTtc,
      currency: doc.currency,
      partner: doc.partnerName,
      extractedText: doc.extractedText,
      extractedData: doc.extractedData ? JSON.parse(doc.extractedData) : null
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metadata_${doc.id}_${doc.filename.split('.')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Bulk Actions
  compileZip() {
    if (this.selectedIds().size === 0) return;
    this.compilingZip.set(true);

    const ids = Array.from(this.selectedIds());
    const docsToDownload = this.documents().filter(d => ids.includes(d.id));
    const zip = new JSZip();

    // Fetch files as Blobs
    const downloadRequests = docsToDownload.map(doc => 
      this.documentService.getById(doc.id).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(downloadRequests).subscribe({
      next: (responses) => {
        // Fetch matching binary files
        const binaryRequests = docsToDownload.map((doc, idx) => {
          return fetch(this.documentService.getDownloadUrl(doc.id))
            .then(res => {
              if (!res.ok) throw new Error();
              return res.blob();
            })
            .then(blob => {
              zip.file(doc.filename, blob);
            })
            .catch(() => {
              console.error(`Failed to download binary file: ${doc.filename}`);
            });
        });

        Promise.all(binaryRequests).then(() => {
          zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `filora_documents_${this.companyName().replace(/\s+/g, '_')}_${this.docTypeName().replace(/\s+/g, '_')}.zip`;
            link.click();
            window.URL.revokeObjectURL(url);
            this.compilingZip.set(false);
            this.toastService.success('ZIP Compiled', 'Successfully compiled and downloaded ZIP archive.');
          });
        });
      },
      error: () => {
        this.compilingZip.set(false);
        this.toastService.error('Error', 'Failed to compile ZIP file.');
      }
    });
  }

  triggerBulkShare() {
    this.toastService.info('Share Selected', 'Bulk email sharing is coming soon. Please share documents individually.');
  }

  // Deletion logic
  deleteDoc(doc: DocumentDto) {
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
      return `Are you sure you want to delete the ${this.selectedIds().size} selected documents?`;
    }
    return `Are you sure you want to delete "${this.docToDelete()?.filename}"?`;
  }

  onConfirmDelete() {
    this.showConfirmDeleteDialog.set(false);
    this.loading.set(true);

    if (this.isBulkDelete()) {
      const ids = Array.from(this.selectedIds());
      this.documentService.bulkDelete(ids).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.success('Deleted', 'Successfully deleted selected documents.');
            this.selectedIds.set(new Set());
            this.loadDocuments();
          } else {
            this.toastService.error('Delete Failed', res.message || 'Could not delete documents.');
            this.loading.set(false);
          }
        },
        error: (err) => {
          this.toastService.error('Error', err.error?.message || 'Error occurred while bulk deleting.');
          this.loading.set(false);
        }
      });
    } else {
      const doc = this.docToDelete();
      if (!doc) return;

      this.documentService.delete(doc.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.success('Deleted', `Document "${doc.filename}" deleted successfully.`);
            this.selectedIds.update(current => {
              const next = new Set(current);
              next.delete(doc.id);
              return next;
            });
            this.loadDocuments();
          } else {
            this.toastService.error('Delete Failed', res.message || 'Could not delete document.');
            this.loading.set(false);
          }
        },
        error: (err) => {
          this.toastService.error('Error', err.error?.message || 'Error occurred while deleting document.');
          this.loading.set(false);
        }
      });
    }
  }

  hasDocumentIssue(doc: DocumentDto): boolean {
    const ocrDone = (doc.ocrStatus || '').toString().trim().toUpperCase() === 'DONE'
      || (doc.ocrStatus || '').toString().trim().toUpperCase() === 'COMPLETED';

    const hasInvoiceAmounts =
      doc.totalHt !== undefined && doc.totalHt !== null &&
      doc.tva !== undefined && doc.tva !== null &&
      doc.totalTtc !== undefined && doc.totalTtc !== null;

    if (doc.isInvoice) {
      return !ocrDone && !hasInvoiceAmounts;
    }

    return !ocrDone;
  }

  cancelDelete() {
    this.showConfirmDeleteDialog.set(false);
    this.docToDelete.set(null);
  }
}
