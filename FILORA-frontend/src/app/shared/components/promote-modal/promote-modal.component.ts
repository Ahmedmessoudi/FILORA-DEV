import { Component, Input, Output, EventEmitter, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EntityService, EntityDto } from '../../../core/services/entity.service';
import { DocTypeService, DocTypeDto } from '../../../core/services/doctype.service';
import { TempDocumentService } from '../../../core/services/temp-document.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-promote-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ 'dms.promote_title' | translate }}</h3>
          <button class="btn-close" (click)="onCancel()" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
              <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          @if (loading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <span>Loading categories...</span>
            </div>
          } @else {
            <!-- Company Selection -->
            <div class="form-group">
              <label class="form-label" for="company-select">{{ 'dms.select_company' | translate }}</label>
              <select id="company-select" class="form-control" [(ngModel)]="selectedCompanyId" (change)="onCompanyChange()">
                <option [value]="null" disabled selected>-- Select Company --</option>
                @for (company of companies(); track company.id) {
                  <option [value]="company.id">{{ company.name }}</option>
                }
              </select>
            </div>

            <!-- DocType Selection -->
            <div class="form-group">
              <label class="form-label" for="doctype-select">{{ 'dms.select_doctype' | translate }}</label>
              <select id="doctype-select" class="form-control" [(ngModel)]="selectedDocTypeId" [disabled]="!selectedCompanyId">
                <option [value]="null" disabled selected>-- Select Folder --</option>
                @for (docType of filteredDocTypes(); track docType.id) {
                  <option [value]="docType.id">{{ docType.name }}</option>
                }
              </select>
              @if (selectedCompanyId && filteredDocTypes().length === 0) {
                <span class="error-text">No folders are mapped to this company.</span>
              }
            </div>
          }
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onCancel()">{{ 'dms.cancel' | translate }}</button>
          <button class="btn btn-primary" 
                  [disabled]="!selectedCompanyId || !selectedDocTypeId || promoting()" 
                  (click)="onConfirm()">
            @if (promoting()) {
              <div class="spinner-sm"></div>
            } @else {
              {{ 'dms.confirm' | translate }}
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
      max-width: 500px;
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
    .btn-close:hover {
      color: var(--text-primary);
    }
    .modal-body {
      padding: 24px 20px;
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
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;
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
    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .error-text {
      font-size: 0.8rem;
      color: var(--error);
      margin-top: 4px;
      display: block;
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
export class PromoteModalComponent implements OnInit {
  @Input() tempDocId!: number;
  @Input() docName = '';

  @Output() promoted = new EventEmitter<number>();
  @Output() cancel = new EventEmitter<void>();

  private readonly entityService = inject(EntityService);
  private readonly docTypeService = inject(DocTypeService);
  private readonly tempDocumentService = inject(TempDocumentService);
  private readonly toastService = inject(ToastService);

  companies = signal<EntityDto[]>([]);
  allDocTypes = signal<DocTypeDto[]>([]);
  // Mapping of DocType Id -> Entity Ids assigned
  docTypeMappings = new Map<number, number[]>();

  selectedCompanyId: number | null = null;
  selectedDocTypeId: number | null = null;
  filteredDocTypes = signal<DocTypeDto[]>([]);

  loading = signal(true);
  promoting = signal(false);

  ngOnInit() {
    this.loadMappings();
  }

  loadMappings() {
    this.loading.set(true);
    forkJoin({
      entities: this.entityService.getActive(),
      docTypes: this.docTypeService.getAll()
    }).subscribe({
      next: (res) => {
        if (res.entities.success && res.docTypes.success) {
          this.companies.set(res.entities.data);
          const doctypes: DocTypeDto[] = res.docTypes.data;
          this.allDocTypes.set(doctypes);

          if (doctypes.length === 0) {
            this.loading.set(false);
            return;
          }

          // Fetch assigned entities for each doctype
          const mappingRequests = doctypes.map(dt =>
            this.docTypeService.getAssignedEntities(dt.id!).pipe()
          );

          forkJoin(mappingRequests).subscribe({
            next: (mappings) => {
              doctypes.forEach((dt, index) => {
                const assigned = mappings[index];
                const entityIds = assigned.success ? assigned.data.map((e: any) => e.id) : [];
                this.docTypeMappings.set(dt.id!, entityIds);
              });
              this.loading.set(false);
            },
            error: () => {
              this.toastService.error('Error', 'Failed to load document type mappings.');
              this.loading.set(false);
            }
          });
        } else {
          this.toastService.error('Error', 'Failed to load entities and document types.');
          this.loading.set(false);
        }
      },
      error: () => {
        this.toastService.error('Error', 'Network error while loading categories.');
        this.loading.set(false);
      }
    });
  }

  onCompanyChange() {
    this.selectedDocTypeId = null;
    if (!this.selectedCompanyId) {
      this.filteredDocTypes.set([]);
      return;
    }

    const companyIdNum = Number(this.selectedCompanyId);
    // Filter doctypes that are assigned to this company
    const filtered = this.allDocTypes().filter(dt => {
      const assignedEntityIds = this.docTypeMappings.get(dt.id!) || [];
      return assignedEntityIds.includes(companyIdNum);
    });

    this.filteredDocTypes.set(filtered);
  }

  onConfirm() {
    if (!this.selectedCompanyId || !this.selectedDocTypeId) return;

    this.promoting.set(true);
    this.tempDocumentService.promote(
      this.tempDocId,
      Number(this.selectedCompanyId),
      Number(this.selectedDocTypeId)
    ).subscribe({
      next: (res) => {
        this.promoting.set(false);
        if (res.success) {
          this.toastService.success('Success', `Document "${this.docName}" promoted successfully.`);
          const createdId = res.data?.id;
          this.promoted.emit(createdId);
        } else {
          this.toastService.error('Failure', res.message || 'Failed to promote document.');
        }
      },
      error: (err) => {
        this.promoting.set(false);
        // Error toast will be shown automatically by auth.interceptor if it is a general HTTP error,
        // but let's make sure it handles any local backend message
        this.toastService.error('Error', err.error?.message || 'Error occurred while promoting document.');
      }
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}
