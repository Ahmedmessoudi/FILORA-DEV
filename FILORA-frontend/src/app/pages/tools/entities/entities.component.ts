import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { EntityService, EntityDto } from '../../../core/services/entity.service';
import { DocTypeService, DocTypeDto } from '../../../core/services/doctype.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-entities',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ConfirmDialogComponent],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div class="header-title-section">
          <h1>{{ 'tools.entities_title' | translate }}</h1>
          <p class="subtitle">Configure corporate entities with address, email, phone, and status information.</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateForm()">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
          </svg>
          <span>{{ 'tools.create_entity' | translate }}</span>
        </button>
      </div>

      <!-- Companies Table -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading entities...</span>
        </div>
      } @else {
        <div class="card card-table glass-panel">
          @if (entities().length === 0) {
            <div class="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" height="64" viewBox="0 -960 960 960" width="64" fill="var(--text-muted)">
                <path d="M160-120q-33 0-56.5-23.5T80-200v-560q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T920-760v560q0 33-23.5 56.5T840-120H160Zm0-80h640v-480H160v480Z"/>
              </svg>
              <h3>No entities registered</h3>
              <p>Add your first corporate entity to configure document workflows.</p>
              <button class="btn btn-primary btn-sm" (click)="openCreateForm()">Add Entity</button>
            </div>
          } @else {
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Description</th>
                    <th>DocTypes</th>
                    <th>Status</th>
                    <th style="width:200px;" class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entity of entities(); track entity.id) {
                    <tr [class.inactive]="!entity.isActive">
                      <td class="text-bold">{{ entity.name }}</td>
                      <td>{{ entity.address }}</td>
                      <td>{{ entity.email }}</td>
                      <td>{{ entity.phone }}</td>
                      <td>{{ entity.description || '—' }}</td>
                        <td>
                          <div class="tag-container">
                            @for (dt of (entityDocTypes()[entity.id!] || []); track dt.id) {
                              <span class="tag tag-gray">{{ dt.name }}</span>
                            }
                            @if (!(entityDocTypes()[entity.id!] && entityDocTypes()[entity.id!].length)) {
                              <span class="text-muted italic text-xs">None</span>
                            }
                          </div>
                        </td>
                      <td>
                        <button class="status-toggle-btn" [class.active]="entity.isActive" (click)="toggleActive(entity)">
                          {{ entity.isActive ? 'Active' : 'Inactive' }}
                        </button>
                      </td>
                      <td class="text-center">
                        <div class="actions-group">
                          <button class="action-btn btn-edit" title="Edit" (click)="openEditForm(entity)">
                            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M200-200h57l367-367-57-57-367 367v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg>
                          </button>
                          <button class="action-btn btn-delete" title="Delete" (click)="deleteEntity(entity)">
                            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>
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
      }
    </div>

    <!-- Company Creation / Edit Modal Dialog -->
    @if (formOpen()) {
      <div class="modal-overlay" (click)="closeForm()">
        <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ isEditMode() ? 'Edit Entity' : ('tools.create_entity' | translate) }}</h3>
            <button class="btn-close" (click)="closeForm()">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveEntity()" #entityForm="ngForm">
              <!-- Company Name -->
              <div class="form-group">
                <label class="form-label" for="company-name">Entity Name *</label>
                <input type="text" id="company-name" class="form-control" name="name"
                       [(ngModel)]="editPayload.name" required placeholder="e.g. Acme Corp SA">
              </div>

              <!-- Address -->
              <div class="form-group">
                <label class="form-label" for="company-address">Address *</label>
                <input type="text" id="company-address" class="form-control" name="address"
                       [(ngModel)]="editPayload.address" required placeholder="Entity address">
              </div>

              <div class="form-row">
                <!-- Email -->
                <div class="form-group col-6">
                  <label class="form-label" for="company-email">Email *</label>
                  <input type="email" id="company-email" class="form-control" name="email"
                         [(ngModel)]="editPayload.email" required email>
                </div>

                <!-- Phone -->
                <div class="form-group col-6">
                  <label class="form-label" for="company-phone">Phone *</label>
                  <input type="text" id="company-phone" class="form-control" name="phone"
                         [(ngModel)]="editPayload.phone" required>
                </div>
              </div>

              <!-- Description -->
              <div class="form-group">
                <label class="form-label" for="company-description">Description</label>
                <textarea id="company-description" class="form-control" name="description" rows="3"
                          [(ngModel)]="editPayload.description" placeholder="Optional details"></textarea>
              </div>

              <!-- Active Toggle -->
              <div class="form-group">
                <label class="checkbox-container">
                  <input type="checkbox" name="isActive" [(ngModel)]="editPayload.isActive">
                  <span class="checkbox-checkmark"></span>
                  <span class="checkbox-label" style="margin-left: 28px;">Active Entity (enable logins and operations)</span>
                </label>
              </div>

              <button type="submit" style="display: none;" #submitBtn></button>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeForm()">Cancel</button>
            <button class="btn btn-primary" [disabled]="entityForm.invalid || saving()" (click)="submitBtn.click()">
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
        title="Delete Entity"
        [message]="'Are you sure you want to permanently delete corporate entity ' + selectedEntity()?.name + '? All folder mappings will be removed.'"
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
    }
    .table-container {
      width: 100%;
      overflow-x: auto;
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
    .action-btn:hover { background-color: var(--bg-primary); }
    .btn-edit:hover { color: var(--primary); }
    .btn-delete:hover { color: var(--error); background-color: var(--error-light); }
    /* Tags inside table */
    .tag-container {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .tag {
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      display: inline-block;
    }
    .tag-gray {
      background-color: var(--bg-tertiary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
    }
    .status-toggle-btn {
      background-color: var(--error-light);
      color: var(--error);
      font-size: 0.78rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: var(--radius-full);
      cursor: pointer;
      border: none;
      transition: all var(--transition-fast);
    }
    .status-toggle-btn.active { background-color: var(--success-light); color: var(--success); }
    
    .companies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .company-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: all var(--transition-normal);
    }
    .company-card.inactive {
      opacity: 0.75;
      border-style: dashed;
    }
    .company-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
    }
    .company-name {
      font-size: 1.15rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .nif-text {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 2px;
      display: block;
    }
    .status-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }
    
    .company-card-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 0.9rem;
    }
    .quota-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .quota-label {
      color: var(--text-secondary);
    }
    
    .company-card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: auto;
      border-top: 1px solid var(--border-color);
      padding-top: 12px;
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
      max-width: 500px;
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
    .form-row {
      display: flex;
      gap: 12px;
    }
    .col-4 { width: 33.33%; }
    
    .quotas-section {
      margin-top: 8px;
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 14px;
      background-color: var(--bg-tertiary);
    }
    .section-subtitle {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      margin-bottom: 12px;
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

    .loading-state, .empty-state {
      padding: 60px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      gap: 16px;
      text-align: center;
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
    
    .empty-state h3 {
      font-size: 1.2rem;
      color: var(--text-primary);
      margin-top: 8px;
    }
    .empty-state p {
      font-size: 0.9rem;
      color: var(--text-muted);
      max-width: 320px;
    }

    .text-bold { font-weight: 600; }
    .italic { font-style: italic; }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.85rem;
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
    .animate-fade-in {
      animation: fade-in 0.25s ease-out forwards;
    }
  `]
})
export class EntitiesComponent implements OnInit {
  private readonly entityService = inject(EntityService);
  private readonly docTypeService = inject(DocTypeService);
  private readonly toastService = inject(ToastService);

  entities = signal<EntityDto[]>([]);
  entityDocTypes = signal<Record<number, DocTypeDto[]>>({});
  loading = signal(true);
  saving = signal(false);

  // Form handling
  formOpen = signal(false);
  isEditMode = signal(false);
  editPayload: EntityDto = this.getBlankEntity();

  // Deletion handling
  showConfirmDeleteDialog = signal(false);
  selectedEntity = signal<EntityDto | null>(null);

  ngOnInit() {
    this.loadEntities();
  }

  loadEntities() {
    this.loading.set(true);
    this.entityService.getAll().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.entities.set(res.data || []);
          // load doctypes mapping for entities
          this.loadDocTypeMappings();
        } else {
          this.toastService.error('Error', res.message || 'Failed to retrieve entities.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Error', 'Network error while loading entities.');
      }
    });
  }

  loadDocTypeMappings() {
    this.docTypeService.getAll().subscribe({
      next: (res) => {
        if (!res.success) {
          this.entityDocTypes.set({});
          return;
        }

        const docTypes: DocTypeDto[] = res.data || [];
        const requests = docTypes.map(dt => this.docTypeService.getAssignedEntities(dt.id!));

        if (requests.length === 0) {
          this.entityDocTypes.set({});
          return;
        }

        forkJoin(requests).subscribe({
          next: (assignedResults) => {
            const mapping: Record<number, DocTypeDto[]> = {};
            docTypes.forEach((dt, index) => {
              const assigned = assignedResults[index];
              const entityIds = assigned.success ? (assigned.data || []).map((e: any) => e.id) : [];
              entityIds.forEach((entId: number) => {
                if (!mapping[entId]) mapping[entId] = [];
                mapping[entId].push(dt);
              });
            });
            this.entityDocTypes.set(mapping);
          },
          error: () => {
            this.entityDocTypes.set({});
          }
        });
      },
      error: () => {
        this.entityDocTypes.set({});
      }
    });
  }

  getBlankEntity(): EntityDto {
    return {
      name: '',
      address: '',
      email: '',
      phone: '',
      isActive: false,
      description: ''
    };
  }

  openCreateForm() {
    this.isEditMode.set(false);
    this.editPayload = this.getBlankEntity();
    this.formOpen.set(true);
  }

  openEditForm(entity: EntityDto) {
    this.isEditMode.set(true);
    this.editPayload = { ...entity };
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  saveEntity() {
    this.saving.set(true);
    
    if (this.isEditMode()) {
      this.entityService.update(this.editPayload.id!, this.editPayload).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Success', `Entity "${this.editPayload.name}" updated successfully.`);
            this.formOpen.set(false);
            this.loadEntities();
          } else {
            this.toastService.error('Save Failed', res.message || 'Could not update entity.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.toastService.error('Error', err.error?.message || 'Error occurred while saving modifications.');
        }
      });
    } else {
      this.entityService.create(this.editPayload).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Success', `Entity "${this.editPayload.name}" created successfully.`);
            this.formOpen.set(false);
            this.loadEntities();
          } else {
            this.toastService.error('Creation Failed', res.message || 'Could not register entity.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.toastService.error('Error', err.error?.message || 'Error occurred while registering entity.');
        }
      });
    }
  }

  deleteEntity(entity: EntityDto) {
    this.selectedEntity.set(entity);
    this.showConfirmDeleteDialog.set(true);
  }

  onConfirmDelete() {
    const entity = this.selectedEntity();
    this.showConfirmDeleteDialog.set(false);
    if (!entity || !entity.id) return;

    this.loading.set(true);
    this.entityService.delete(entity.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Deleted', `Entity "${entity.name}" deleted successfully.`);
          this.loadEntities();
        } else {
          this.toastService.error('Delete Failed', res.message || 'Could not delete entity.');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.toastService.error('Error', err.error?.message || 'Error occurred while deleting entity.');
        this.loading.set(false);
      }
    });
  }

  cancelDelete() {
    this.showConfirmDeleteDialog.set(false);
    this.selectedEntity.set(null);
  }

  toggleActive(entity: EntityDto) {
    if (!entity || !entity.id) return;
    const newStatus = !entity.isActive;
    this.saving.set(true);
    const payload = { ...entity, isActive: newStatus } as EntityDto;
    this.entityService.update(entity.id!, payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.toastService.success('Updated', `Entity "${entity.name}" ${newStatus ? 'activated' : 'deactivated'}.`);
          this.loadEntities();
        } else {
          this.toastService.error('Update Failed', res.message || 'Could not update entity.');
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toastService.error('Error', err.error?.message || 'Error occurred while updating entity status.');
      }
    });
  }
}
