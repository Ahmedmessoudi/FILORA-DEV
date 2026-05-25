import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PartnerService, PartnerDto } from '../../../core/services/partner.service';
import { PartnerTypeService, PartnerTypeDto } from '../../../core/services/partner-type.service';
import { EntityService, EntityDto } from '../../../core/services/entity.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ConfirmDialogComponent],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div class="header-title-section">
          <h1>{{ 'tools.partners_title' | translate }}</h1>
          <p class="subtitle">Manage external stakeholders, vendors, and customers. Map them to corporate entities and partner types.</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateForm()">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
          </svg>
          <span>{{ 'tools.create_partner' | translate }}</span>
        </button>
      </div>

      <!-- Main Partners Table Card -->
      <div class="card card-table glass-panel">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading partners...</span>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Identifiers</th>
                  <th>Contact</th>
                  <th>Partner Types</th>
                  <th>Assigned Entities</th>
                  <th>Status</th>
                  <th style="width: 150px;" class="text-center">{{ 'dms.actions' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (partner of partners(); track partner.id) {
                  <tr>
                    <td class="text-bold">
                      <div>{{ partner.companyName }}</div>
                      @if (partner.tradeName) {
                        <div class="text-xs text-muted" style="margin-top: 2px;">Trade: {{ partner.tradeName }}</div>
                      }
                    </td>
                    <td>
                      <div class="text-xs">UID: <span class="text-bold">{{ partner.uniqueIdentifier }}</span></div>
                    </td>
                    <td>
                      <div class="text-sm">{{ partner.email }}</div>
                      <div class="text-xs text-muted">{{ partner.phone1 }}</div>
                      @if (partner.phone2 || partner.phone3) {
                        <div class="text-xs text-muted">
                          Alt: {{ formatAltPhones(partner.phone2, partner.phone3) }}
                        </div>
                      }
                    </td>
                    <td>
                      <div class="tag-container">
                        @for (typeId of partner.partnerTypeIds; track typeId) {
                          <span class="tag tag-blue">{{ getPartnerTypeName(typeId) }}</span>
                        }
                        @if (partner.partnerTypeIds.length === 0) {
                          <span class="text-muted italic text-xs">Uncategorized</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="tag-container">
                        @for (compId of partner.assignedCompanyIds; track compId) {
                          <span class="tag tag-gray">{{ getCompanyName(compId) }}</span>
                        }
                        @if (partner.assignedCompanyIds.length === 0) {
                          <span class="text-muted italic text-xs">None</span>
                        }
                      </div>
                    </td>
                    <td>
                      <button class="status-toggle-btn" 
                              [class.active]="partner.isActive"
                              (click)="toggleActive(partner)">
                        {{ partner.isActive ? 'Active' : 'Inactive' }}
                      </button>
                    </td>
                    <td class="text-center">
                      <div class="actions-group">
                        <button class="action-btn btn-edit" title="Edit Partner" (click)="openEditForm(partner)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M200-200h57l367-367-57-57-367 367v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/>
                          </svg>
                        </button>
                        <button class="action-btn btn-delete" title="Delete Partner" (click)="deletePartner(partner)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
                @if (partners().length === 0) {
                  <tr>
                    <td colspan="7" class="text-center text-muted py-8">
                      No partners registered yet.
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
            <h3>{{ isEditMode() ? 'Edit Partner Details' : ('tools.create_partner' | translate) }}</h3>
            <button class="btn-close" (click)="closeForm()">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="savePartner()" #partnerForm="ngForm">
              <!-- Company Name -->
              <div class="form-group">
                <label class="form-label" for="companyName">Company Name *</label>
                <input type="text" id="companyName" class="form-control" name="companyName"
                       [(ngModel)]="editPayload.companyName" required placeholder="e.g. Acme Supplier Ltd">
              </div>

              <div class="form-row">
                <!-- Trade Name -->
                <div class="form-group col-6">
                  <label class="form-label" for="tradeName">Trade Name</label>
                  <input type="text" id="tradeName" class="form-control" name="tradeName"
                         [(ngModel)]="editPayload.tradeName" placeholder="Optional trade name">
                </div>
                <!-- Unique Identifier -->
                <div class="form-group col-6">
                  <label class="form-label" for="uniqueIdentifier">Unique Identifier *</label>
                  <input type="text" id="uniqueIdentifier" class="form-control" name="uniqueIdentifier"
                         [(ngModel)]="editPayload.uniqueIdentifier" required placeholder="Tax ID / Registration">
                </div>
              </div>

              <div class="form-row">
                <!-- Email (required) -->
                <div class="form-group col-6">
                  <label class="form-label" for="email">Email *</label>
                  <input type="email" id="email" class="form-control" name="email"
                         [(ngModel)]="editPayload.email" required email placeholder="rep@partner.com">
                </div>
                <!-- Phone 1 (required) -->
                <div class="form-group col-6">
                  <label class="form-label" for="phone1">Phone 1 *</label>
                  <input type="text" id="phone1" class="form-control" name="phone1"
                         [(ngModel)]="editPayload.phone1" required placeholder="+123456789">
                </div>
              </div>

              <div class="form-row">
                <!-- Phone 2 -->
                <div class="form-group col-6">
                  <label class="form-label" for="phone2">Phone 2</label>
                  <input type="text" id="phone2" class="form-control" name="phone2"
                         [(ngModel)]="editPayload.phone2" placeholder="Optional">
                </div>
                <!-- Phone 3 -->
                <div class="form-group col-6">
                  <label class="form-label" for="phone3">Phone 3</label>
                  <input type="text" id="phone3" class="form-control" name="phone3"
                         [(ngModel)]="editPayload.phone3" placeholder="Optional">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="mailingAddress">Mailing Address *</label>
                <input type="text" id="mailingAddress" class="form-control" name="mailingAddress"
                       [(ngModel)]="editPayload.mailingAddress" required placeholder="Mailing address">
              </div>

              <div class="form-group">
                <label class="form-label" for="billingAddress">Billing Address</label>
                <input type="text" id="billingAddress" class="form-control" name="billingAddress"
                       [(ngModel)]="editPayload.billingAddress" placeholder="Billing address (optional)">
              </div>

              <div class="form-row">
                <div class="form-group col-6">
                  <label class="form-label" for="paymentTerms">Payment Terms</label>
                  <input type="text" id="paymentTerms" class="form-control" name="paymentTerms"
                         [(ngModel)]="editPayload.paymentTerms" placeholder="e.g. 30 days">
                </div>
                <div class="form-group col-6">
                  <label class="form-label" for="billingTerms">Billing Terms</label>
                  <input type="text" id="billingTerms" class="form-control" name="billingTerms"
                         [(ngModel)]="editPayload.billingTerms" placeholder="e.g. Monthly">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col-6">
                  <label class="form-label" for="bankAccountNumber">Bank Account #</label>
                  <input type="text" id="bankAccountNumber" class="form-control" name="bankAccountNumber"
                         [(ngModel)]="editPayload.bankAccountNumber" placeholder="IBAN / Account number">
                </div>
                <div class="form-group col-6">
                  <label class="form-label" for="bankName">Bank Name</label>
                  <input type="text" id="bankName" class="form-control" name="bankName"
                         [(ngModel)]="editPayload.bankName" placeholder="Bank name">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="notes">Notes</label>
                <textarea id="notes" class="form-control" name="notes" rows="3"
                          [(ngModel)]="editPayload.notes" placeholder="Additional notes"></textarea>
              </div>

              <!-- Partner Types selection -->
              <div class="selection-section">
                <label class="form-label text-bold">Partner Types</label>
                <div class="checkboxes-grid">
                  @for (type of partnerTypes(); track type.id) {
                    <label class="checkbox-container">
                      <input type="checkbox" 
                             [checked]="isTypeSelected(type.id!)"
                             (change)="toggleTypeSelection(type.id!)">
                      <span class="checkbox-checkmark"></span>
                      <span class="checkbox-label" style="margin-left: 28px;">{{ type.name }}</span>
                    </label>
                  }
                  @if (partnerTypes().length === 0) {
                    <span class="text-muted italic text-xs">No partner types created.</span>
                  }
                </div>
              </div>

              <!-- Companies selection -->
              <div class="selection-section" style="margin-top: 16px;">
                <label class="form-label text-bold">Entity Assignments</label>
                <div class="checkboxes-grid">
                  @for (comp of companies(); track comp.id) {
                    <label class="checkbox-container">
                      <input type="checkbox" 
                             [checked]="isCompanySelected(comp.id!)"
                             (change)="toggleCompanySelection(comp.id!)">
                      <span class="checkbox-checkmark"></span>
                      <span class="checkbox-label" style="margin-left: 28px;">{{ comp.name }}</span>
                    </label>
                  }
                  @if (companies().length === 0) {
                    <span class="text-muted italic text-xs">No active entities.</span>
                  }
                </div>
              </div>

              <!-- Active flag -->
              <div class="form-group" style="margin-top: 16px;">
                <label class="checkbox-container">
                  <input type="checkbox" name="isActive" [(ngModel)]="editPayload.isActive">
                  <span class="checkbox-checkmark"></span>
                  <span class="checkbox-label" style="margin-left: 28px;">Active partner account</span>
                </label>
              </div>

              <button type="submit" style="display: none;" #submitBtn></button>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeForm()">Cancel</button>
            <button class="btn btn-primary" [disabled]="partnerForm.invalid || saving()" (click)="submitBtn.click()">
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
        title="Delete Partner"
        [message]="'Are you sure you want to permanently delete partner ' + selectedPartner()?.companyName + '?'"
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
    .tag-blue {
      background-color: var(--primary-light);
      color: var(--primary);
    }
    .tag-gray {
      background-color: var(--bg-tertiary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
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
      max-width: 600px;
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
      max-height: 70vh;
      overflow-y: auto;
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
      gap: 16px;
    }
    .col-6 { width: 50%; }
    .col-4 { width: 33.33%; }

    .identifiers-section {
      margin-top: 8px;
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 12px;
      background-color: var(--bg-tertiary);
    }
    .section-subtitle {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .selection-section {
      border-top: 1px solid var(--border-color);
      padding-top: 12px;
    }
    .checkboxes-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 8px;
    }

    /* Checkbox */
    .checkbox-container {
      display: flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      font-size: 0.85rem;
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
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.85rem; }
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
export class PartnersComponent implements OnInit {
  private readonly partnerService = inject(PartnerService);
  private readonly partnerTypeService = inject(PartnerTypeService);
  private readonly entityService = inject(EntityService);
  private readonly toastService = inject(ToastService);

  partners = signal<PartnerDto[]>([]);
  partnerTypes = signal<PartnerTypeDto[]>([]);
  companies = signal<EntityDto[]>([]);
  loading = signal(true);
  saving = signal(false);

  // Form handling
  formOpen = signal(false);
  isEditMode = signal(false);
  editPayload: PartnerDto = this.getBlankPartner();

  // Delete confirm dialog handling
  showConfirmDeleteDialog = signal(false);
  selectedPartner = signal<PartnerDto | null>(null);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    forkJoin({
      partnersList: this.partnerService.getAll(),
      typesList: this.partnerTypeService.getAll(),
      entitiesList: this.entityService.getActive()
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.partnersList.success) {
          this.partners.set(res.partnersList.data || []);
        }
        if (res.typesList.success) {
          this.partnerTypes.set(res.typesList.data || []);
        }
        if (res.entitiesList.success) {
          this.companies.set(res.entitiesList.data || []);
        }
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Error', 'Failed to retrieve partner administrative data.');
      }
    });
  }

  getBlankPartner(): PartnerDto {
    return {
      companyName: '',
      tradeName: '',
      uniqueIdentifier: '',
      mailingAddress: '',
      billingAddress: '',
      phone1: '',
      phone2: '',
      phone3: '',
      email: '',
      paymentTerms: '',
      billingTerms: '',
      bankAccountNumber: '',
      bankName: '',
      notes: '',
      isActive: false,
      assignedCompanyIds: [],
      partnerTypeIds: []
    };
  }

  getPartnerTypeName(id: number): string {
    const type = this.partnerTypes().find(t => t.id === id);
    return type ? type.name : `Type #${id}`;
  }

  getCompanyName(id: number): string {
    const comp = this.companies().find(c => c.id === id);
    return comp ? comp.name : `Entity #${id}`;
  }

  formatAltPhones(phone2?: string, phone3?: string): string {
    const values = [phone2, phone3].filter((value): value is string => Boolean(value));
    return values.join(' / ');
  }

  toggleActive(partner: PartnerDto) {
    if (!partner.id) return;
    const updated = { ...partner, isActive: !partner.isActive };
    this.partnerService.update(partner.id, updated).subscribe({
      next: (res) => {
        if (res.success) {
          partner.isActive = !partner.isActive;
          this.toastService.success(
            'Partner Updated', 
            `Partner "${partner.companyName}" status updated to ${partner.isActive ? 'Active' : 'Inactive'}.`
          );
        } else {
          this.toastService.error('Error', res.message || 'Failed to update status.');
        }
      },
      error: (err) => {
        this.toastService.error('Error', err.error?.message || 'Could not update partner status.');
      }
    });
  }

  openCreateForm() {
    this.isEditMode.set(false);
    this.editPayload = this.getBlankPartner();
    this.formOpen.set(true);
  }

  openEditForm(partner: PartnerDto) {
    this.isEditMode.set(true);
    this.editPayload = { 
      ...partner, 
      assignedCompanyIds: [...partner.assignedCompanyIds],
      partnerTypeIds: [...partner.partnerTypeIds]
    };
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  isTypeSelected(id: number): boolean {
    return this.editPayload.partnerTypeIds.includes(id);
  }

  toggleTypeSelection(id: number) {
    const list = [...this.editPayload.partnerTypeIds];
    const index = list.indexOf(id);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(id);
    }
    this.editPayload.partnerTypeIds = list;
  }

  isCompanySelected(id: number): boolean {
    return this.editPayload.assignedCompanyIds.includes(id);
  }

  toggleCompanySelection(id: number) {
    const list = [...this.editPayload.assignedCompanyIds];
    const index = list.indexOf(id);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(id);
    }
    this.editPayload.assignedCompanyIds = list;
  }

  savePartner() {
    this.saving.set(true);
    if (this.isEditMode()) {
      this.partnerService.update(this.editPayload.id!, this.editPayload).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Success', `Partner "${this.editPayload.companyName}" updated successfully.`);
            this.formOpen.set(false);
            this.loadData();
          } else {
            this.toastService.error('Save Failed', res.message || 'Failed to update partner.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.toastService.error('Error', err.error?.message || 'Error occurred while saving modifications.');
        }
      });
    } else {
      this.partnerService.create(this.editPayload).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Success', `Partner "${this.editPayload.companyName}" registered successfully.`);
            this.formOpen.set(false);
            this.loadData();
          } else {
            this.toastService.error('Creation Failed', res.message || 'Failed to create partner.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.toastService.error('Error', err.error?.message || 'Error occurred while registering partner.');
        }
      });
    }
  }

  // Deletion logic
  deletePartner(partner: PartnerDto) {
    this.selectedPartner.set(partner);
    this.showConfirmDeleteDialog.set(true);
  }

  onConfirmDelete() {
    const partner = this.selectedPartner();
    this.showConfirmDeleteDialog.set(false);
    if (!partner || !partner.id) return;

    this.loading.set(true);
    this.partnerService.delete(partner.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Deleted', `Partner "${partner.companyName}" deleted successfully.`);
          this.loadData();
        } else {
          this.toastService.error('Delete Failed', res.message || 'Could not delete partner.');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.toastService.error('Error', err.error?.message || 'Error occurred while deleting partner.');
        this.loading.set(false);
      }
    });
  }

  cancelDelete() {
    this.showConfirmDeleteDialog.set(false);
    this.selectedPartner.set(null);
  }
}
