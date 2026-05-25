import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerTypeService, PartnerTypeDto } from '../../../core/services/partner-type.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-partner-types',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ConfirmDialogComponent],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div class="header-title-section">
          <h1>{{ 'tools.partnertypes_title' | translate }}</h1>
          <p class="subtitle">Define categories for external relationships, such as Suppliers, Clients, Subcontractors, or Partners.</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateForm()">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
          </svg>
          <span>Create Partner Type</span>
        </button>
      </div>

      <!-- Main Partner Types Table Card -->
      <div class="card card-table glass-panel">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading partner types...</span>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 80px;">
                    <button type="button" class="table-sort-button" (click)="toggleSort('id')">
                      <span>ID</span>
                      <span class="table-sort-icons">
                        @if (sortColumn === 'id') {
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            @if (sortDirection === 'asc') {
                              <path d="M12 5v14"></path>
                              <path d="M19 12l-7-7-7 7"></path>
                            } @else {
                              <path d="M12 19V5"></path>
                              <path d="M5 12l7 7 7-7"></path>
                            }
                          </svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.35">
                            <path d="M12 5v14"></path>
                            <path d="M19 12l-7-7-7 7"></path>
                            <path d="M5 12l7 7 7-7"></path>
                          </svg>
                        }
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" class="table-sort-button" (click)="toggleSort('name')">
                      <span>Name</span>
                      <span class="table-sort-icons">
                        @if (sortColumn === 'name') {
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            @if (sortDirection === 'asc') {
                              <path d="M12 5v14"></path>
                              <path d="M19 12l-7-7-7 7"></path>
                            } @else {
                              <path d="M12 19V5"></path>
                              <path d="M5 12l7 7 7-7"></path>
                            }
                          </svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.35">
                            <path d="M12 5v14"></path>
                            <path d="M19 12l-7-7-7 7"></path>
                            <path d="M5 12l7 7 7-7"></path>
                          </svg>
                        }
                      </span>
                    </button>
                  </th>
                  <th>
                    <button type="button" class="table-sort-button" (click)="toggleSort('status')">
                      <span>Status</span>
                      <span class="table-sort-icons">
                        @if (sortColumn === 'status') {
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            @if (sortDirection === 'asc') {
                              <path d="M12 5v14"></path>
                              <path d="M19 12l-7-7-7 7"></path>
                            } @else {
                              <path d="M12 19V5"></path>
                              <path d="M5 12l7 7 7-7"></path>
                            }
                          </svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.35">
                            <path d="M12 5v14"></path>
                            <path d="M19 12l-7-7-7 7"></path>
                            <path d="M5 12l7 7 7-7"></path>
                          </svg>
                        }
                      </span>
                    </button>
                  </th>
                  <th style="width: 150px;" class="text-center">{{ 'dms.actions' | translate }}</th>
                </tr>
                <tr class="table-filter-row">
                  <th><input class="table-filter-input" type="text" [(ngModel)]="filterId" placeholder="Search ID"></th>
                  <th><input class="table-filter-input" type="text" [(ngModel)]="filterName" placeholder="Search name"></th>
                  <th>
                    <select class="table-filter-select" [(ngModel)]="filterStatus">
                      <option value="ALL">All</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (type of displayedPartnerTypes(); track type.id) {
                  <tr>
                    <td class="text-muted">#{{ type.id }}</td>
                    <td class="text-bold">{{ type.name }}</td>
                    <td>
                      <button class="status-toggle-btn" 
                              [class.active]="type.status"
                              (click)="toggleActive(type)">
                        {{ type.status ? 'Active' : 'Inactive' }}
                      </button>
                    </td>
                    <td class="text-center">
                      <div class="actions-group">
                        <button class="action-btn btn-edit" title="Edit Type" (click)="openEditForm(type)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M200-200h57l367-367-57-57-367 367v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/>
                          </svg>
                        </button>
                        <button class="action-btn btn-delete" title="Delete Type" (click)="deletePartnerType(type)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
                @if (partnerTypes().length === 0) {
                  <tr>
                    <td colspan="4" class="text-center text-muted py-8">
                      No partner types registered yet.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <!-- Edit/Create Form Drawer / Modal -->
    @if (formOpen()) {
      <div class="modal-overlay" (click)="closeForm()">
        <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ isEditMode() ? 'Edit Partner Type' : 'Create Partner Type' }}</h3>
            <button class="btn-close" (click)="closeForm()">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="savePartnerType()" #typeForm="ngForm">
              <!-- Name -->
              <div class="form-group">
                <label class="form-label" for="name">Name *</label>
                <input type="text" id="name" class="form-control" name="name"
                       [(ngModel)]="editPayload.name" required placeholder="e.g. Supplier, Customer">
              </div>

              <!-- Active status -->
              <div class="form-group" style="margin-top: 16px;">
                <label class="checkbox-container">
                  <input type="checkbox" name="status" [(ngModel)]="editPayload.status">
                  <span class="checkbox-checkmark"></span>
                  <span class="checkbox-label" style="margin-left: 28px;">Active partner category</span>
                </label>
              </div>

              <button type="submit" style="display: none;" #submitBtn></button>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeForm()">Cancel</button>
            <button class="btn btn-primary" [disabled]="typeForm.invalid || saving()" (click)="submitBtn.click()">
              @if (saving()) {
                <div class="spinner-sm"></div>
                <span>Saving...</span>
              } @else {
                <span>Save</span>
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Deletion Confirm Dialog -->
    @if (showConfirmDeleteDialog()) {
      <app-confirm-dialog
        title="Delete Partner Type"
        [message]="'Are you sure you want to permanently delete partner type ' + selectedType()?.name + '?'"
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
      gap: 20px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .header-title-section h1 {
      font-size: 1.75rem;
      margin-bottom: 4px;
    }
    .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
    .card-table {
      padding: 0;
      overflow: hidden;
      min-width: 0;
    }
    .table-container {
      width: 100%;
      overflow-x: auto;
      min-width: 0;
    }
    .table-container .data-table {
      width: 100%;
      table-layout: fixed;
    }
    .table-container .data-table th,
    .table-container .data-table td {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .table-container .data-table th:nth-child(1), .table-container .data-table td:nth-child(1) { width: 100px; }
    .table-container .data-table th:nth-child(2), .table-container .data-table td:nth-child(2) { width: auto; }
    .table-container .data-table th:nth-child(3), .table-container .data-table td:nth-child(3) { width: 120px; }
    .table-container .data-table th:nth-child(4), .table-container .data-table td:nth-child(4) { width: 140px; }
    .code-badge {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      color: var(--primary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-family: monospace;
      font-weight: 600;
    }
    .status-toggle-btn {
      background-color: var(--error-light);
      color: var(--error);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      cursor: pointer;
      border: none;
      transition: all var(--transition-fast);
    }
    .status-toggle-btn.active {
      background-color: var(--success-light);
      color: var(--success);
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
    .btn-edit:hover { color: var(--primary); }
    .btn-delete:hover {
      color: var(--error);
      background-color: var(--error-light);
    }

    /* Modal Overlay & Dialog Styles */
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
      max-width: 450px;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-premium);
      overflow: hidden;
      display: flex;
      flex-direction: column;
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
      padding: 20px;
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
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
      box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.12);
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

    .text-center { text-align: center; }
    .text-bold { font-weight: 600; }
    .py-8 { padding-top: 32px; padding-bottom: 32px; }

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
    .animate-fade-in {
      animation: fade-in 0.25s ease-out forwards;
    }
  `]
})
export class PartnerTypesComponent implements OnInit {
  private readonly partnerTypeService = inject(PartnerTypeService);
  private readonly toastService = inject(ToastService);

  partnerTypes = signal<PartnerTypeDto[]>([]);
  loading = signal(true);
  saving = signal(false);
  sortColumn: 'id' | 'name' | 'status' | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  filterId = '';
  filterName = '';
  filterStatus = 'ALL';

  displayedPartnerTypes = computed(() => {
    const idQuery = this.filterId.trim().toLowerCase();
    const nameQuery = this.filterName.trim().toLowerCase();
    const statusFilter = this.filterStatus;

    const filtered = this.partnerTypes().filter(type => {
      if (idQuery && !String(type.id ?? '').toLowerCase().includes(idQuery)) return false;
      if (nameQuery && !type.name.toLowerCase().includes(nameQuery)) return false;
      if (statusFilter !== 'ALL') {
        const active = statusFilter === 'ACTIVE';
        if (type.status !== active) return false;
      }
      return true;
    });

    return [...filtered].sort((left, right) => {
      const direction = this.sortDirection === 'asc' ? 1 : -1;
      let comparison = 0;

      if (this.sortColumn === 'id') {
        comparison = (left.id ?? 0) - (right.id ?? 0);
      } else if (this.sortColumn === 'status') {
        comparison = Number(left.status) - Number(right.status);
      } else {
        comparison = left.name.localeCompare(right.name);
      }

      return comparison * direction;
    });
  });

  // Form handling
  formOpen = signal(false);
  isEditMode = signal(false);
  editPayload: PartnerTypeDto = this.getBlankType();

  // Delete confirm dialog handling
  showConfirmDeleteDialog = signal(false);
  selectedType = signal<PartnerTypeDto | null>(null);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.partnerTypeService.getAll().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.partnerTypes.set(res.data || []);
        } else {
          this.toastService.error('Error', res.message || 'Failed to retrieve partner types.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Error', 'Network error while retrieving partner types.');
      }
    });
  }

  getBlankType(): PartnerTypeDto {
    return {
      name: '',
      status: false
    };
  }

  toggleActive(type: PartnerTypeDto) {
    if (!type.id) return;
    const updated = { ...type, status: !type.status };
    this.partnerTypeService.update(type.id, updated).subscribe({
      next: (res) => {
        if (res.success) {
          type.status = !type.status;
          this.toastService.success(
            'Updated', 
            `Partner type "${type.name}" status updated to ${type.status ? 'Active' : 'Inactive'}.`
          );
        } else {
          this.toastService.error('Error', res.message || 'Failed to update partner type status.');
        }
      },
      error: (err) => {
        this.toastService.error('Error', err.error?.message || 'Could not update status.');
      }
    });
  }

  openCreateForm() {
    this.isEditMode.set(false);
    this.editPayload = this.getBlankType();
    this.formOpen.set(true);
  }

  openEditForm(type: PartnerTypeDto) {
    this.isEditMode.set(true);
    this.editPayload = { ...type };
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  savePartnerType() {
    this.saving.set(true);
    if (this.isEditMode()) {
      this.partnerTypeService.update(this.editPayload.id!, this.editPayload).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Success', `Partner type "${this.editPayload.name}" updated successfully.`);
            this.formOpen.set(false);
            this.loadData();
          } else {
            this.toastService.error('Save Failed', res.message || 'Failed to update partner type.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.toastService.error('Error', err.error?.message || 'Error occurred while saving modifications.');
        }
      });
    } else {
      this.partnerTypeService.create(this.editPayload).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Success', `Partner type "${this.editPayload.name}" created successfully.`);
            this.formOpen.set(false);
            this.loadData();
          } else {
            this.toastService.error('Creation Failed', res.message || 'Failed to create partner type.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.toastService.error('Error', err.error?.message || 'Error occurred while creating partner type.');
        }
      });
    }
  }

  // Deletion logic
  deletePartnerType(type: PartnerTypeDto) {
    this.selectedType.set(type);
    this.showConfirmDeleteDialog.set(true);
  }

  onConfirmDelete() {
    const type = this.selectedType();
    this.showConfirmDeleteDialog.set(false);
    if (!type || !type.id) return;

    this.loading.set(true);
    this.partnerTypeService.delete(type.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Deleted', `Partner type "${type.name}" deleted successfully.`);
          this.loadData();
        } else {
          this.toastService.error('Delete Failed', res.message || 'Could not delete partner type.');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.toastService.error('Error', err.error?.message || 'Error occurred while deleting partner type.');
        this.loading.set(false);
      }
    });
  }

  cancelDelete() {
    this.showConfirmDeleteDialog.set(false);
    this.selectedType.set(null);
  }

  toggleSort(column: 'id' | 'name' | 'status') {
    if (this.sortColumn === column) {
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
        return;
      }

      this.sortColumn = null;
      this.sortDirection = 'asc';
      return;
    }

    this.sortColumn = column;
    this.sortDirection = 'asc';
  }
}
