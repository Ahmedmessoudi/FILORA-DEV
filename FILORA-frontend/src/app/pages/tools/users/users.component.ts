import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { UserService, UserDto } from '../../../core/services/user.service';
import { EntityService, EntityDto } from '../../../core/services/entity.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ConfirmDialogComponent],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header">
        <div class="header-title-section">
          <h1>{{ 'tools.users_title' | translate }}</h1>
          <p class="subtitle">Create and manage accounts, roles, entity access, and security configurations.</p>
        </div>
        <button class="btn btn-primary" (click)="openCreateForm()">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
          </svg>
          <span>{{ 'tools.create_user' | translate }}</span>
        </button>
      </div>

      <!-- Main Users Table Card -->
      <div class="card card-table glass-panel">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading accounts...</span>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th><button type="button" class="table-sort-button" (click)="toggleSort('username')"><span>Username</span><span class="table-sort-icons">{{ sortColumn === 'username' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲▼' }}</span></button></th>
                  <th><button type="button" class="table-sort-button" (click)="toggleSort('surname')"><span>Full Name</span><span class="table-sort-icons">{{ sortColumn === 'surname' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲▼' }}</span></button></th>
                  <th><button type="button" class="table-sort-button" (click)="toggleSort('email')"><span>Email</span><span class="table-sort-icons">{{ sortColumn === 'email' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲▼' }}</span></button></th>
                  <th><button type="button" class="table-sort-button" (click)="toggleSort('companies')"><span>Companies</span><span class="table-sort-icons">{{ sortColumn === 'companies' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲▼' }}</span></button></th>
                  <th><button type="button" class="table-sort-button" (click)="toggleSort('role')"><span>Role</span><span class="table-sort-icons">{{ sortColumn === 'role' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲▼' }}</span></button></th>
                  <th><button type="button" class="table-sort-button" (click)="toggleSort('language')"><span>Language</span><span class="table-sort-icons">{{ sortColumn === 'language' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲▼' }}</span></button></th>
                  <th><button type="button" class="table-sort-button" (click)="toggleSort('twoFa')"><span>2FA Status</span><span class="table-sort-icons">{{ sortColumn === 'twoFa' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲▼' }}</span></button></th>
                  <th><button type="button" class="table-sort-button" (click)="toggleSort('status')"><span>Status</span><span class="table-sort-icons">{{ sortColumn === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲▼' }}</span></button></th>
                  <th style="width: 200px;" class="text-center">{{ 'dms.actions' | translate }}</th>
                </tr>
                <tr class="table-filter-row">
                  <th><input class="table-filter-input" type="text" [(ngModel)]="filterUsername" placeholder="Search username"></th>
                  <th><input class="table-filter-input" type="text" [(ngModel)]="filterFullName" placeholder="Search name"></th>
                  <th><input class="table-filter-input" type="text" [(ngModel)]="filterEmail" placeholder="Search email"></th>
                  <th>
                    <select class="table-filter-select" [(ngModel)]="filterCompany">
                      <option value="ALL">All entities</option>
                      @for (company of companyOptions(); track company.id) {
                        <option [value]="company.id">{{ company.name }}</option>
                      }
                    </select>
                  </th>
                  <th>
                    <select class="table-filter-select" [(ngModel)]="filterRole">
                      <option value="ALL">All roles</option>
                      <option value="user">USER</option>
                      <option value="admin">ADMIN</option>
                      <option value="superuser">SUPERUSER</option>
                    </select>
                  </th>
                  <th>
                    <select class="table-filter-select" [(ngModel)]="filterLanguage">
                      <option value="ALL">All languages</option>
                      <option value="fr">FR</option>
                      <option value="en">EN</option>
                    </select>
                  </th>
                  <th>
                    <select class="table-filter-select" [(ngModel)]="filterTwoFa">
                      <option value="ALL">All</option>
                      <option value="ENABLED">Enabled</option>
                      <option value="DISABLED">Disabled</option>
                    </select>
                  </th>
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
                @for (user of displayedUsers(); track user.id) {
                  <tr>
                    <td class="text-bold">{{ user.username }}</td>
                    <td>{{ user.surname }}</td>
                    <td>{{ user.email }}</td>
                    <td>
                      <div class="tag-container">
                        @for (compId of user.assignedCompanyIds; track compId) {
                          <span class="tag tag-gray">{{ getCompanyName(compId) }}</span>
                        }
                        @if (user.assignedCompanyIds.length === 0) {
                          <span class="text-muted italic text-xs">None</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="badge" [class]="getRoleBadgeClass(user.role)">
                        {{ user.role.toUpperCase() }}
                      </span>
                    </td>
                    <td><span class="lang-badge">{{ user.language.toUpperCase() }}</span></td>
                    <td>
                      @if (user.twoFaEnabled) {
                        <span class="badge badge-success">2FA Enabled</span>
                      } @else {
                        <span class="badge badge-warning">2FA Disabled</span>
                      }
                    </td>
                    <td>
                      <button class="status-toggle-btn" 
                              [class.active]="user.isActive"
                              (click)="toggleActive(user)">
                        {{ user.isActive ? 'Active' : 'Inactive' }}
                      </button>
                    </td>
                    <td class="text-center">
                      <div class="actions-group">
                        <button class="action-btn btn-edit" title="Edit Account" (click)="openEditForm(user)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M200-200h57l367-367-57-57-367 367v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/>
                          </svg>
                        </button>
                        <button class="action-btn btn-reset" title="Reset Password" (click)="openResetPassword(user)">
                          <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                            <path d="M240-80q-33 0-56.5-23.5T160-200v-40h80v40h480v-480H240v40h-80v-120q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v600q0 33-23.5 56.5T720-120H240Zm40-280-56-56 63-64H80v-80h167l-63-64 56-56 160 160-160 160Z"/>
                          </svg>
                        </button>
                        <button class="action-btn btn-delete" title="Delete User" (click)="deleteUser(user)">
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

    <!-- Edit/Create Glassmorphic Drawer / Side Panel Modal -->
    @if (formOpen()) {
      <div class="modal-overlay" (click)="closeForm()">
        <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ isEditMode() ? ('tools.edit_user' | translate) : ('tools.create_user' | translate) }}</h3>
            <button class="btn-close" (click)="closeForm()">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveUser()" #userForm="ngForm">
              <!-- Username -->
              <div class="form-group">
                <label class="form-label" for="username">Username *</label>
                <input type="text" id="username" class="form-control" name="username"
                       [(ngModel)]="editPayload.username" required [disabled]="isEditMode()">
              </div>

              <!-- Full Name -->
              <div class="form-group">
                <label class="form-label" for="surname">Full Name *</label>
                <input type="text" id="surname" class="form-control" name="surname"
                       [(ngModel)]="editPayload.surname" required>
              </div>

              <!-- Email -->
              <div class="form-group">
                <label class="form-label" for="email">Email *</label>
                <input type="email" id="email" class="form-control" name="email"
                       [(ngModel)]="editPayload.email" required email>
              </div>

              <!-- Password (only for create) -->
              @if (!isEditMode()) {
                <div class="form-group">
                  <label class="form-label" for="password">Password *</label>
                  <input type="password" id="password" class="form-control" name="password"
                         [(ngModel)]="editPayload.password" required minlength="6">
                </div>
              }

              <div class="form-row">
                <!-- Role -->
                <div class="form-group col-6">
                  <label class="form-label" for="role">Role</label>
                  <select id="role" class="form-control" name="role" [(ngModel)]="editPayload.role">
                    <option value="user">USER</option>
                    <option value="admin">ADMIN</option>
                    <option value="superuser">SUPERUSER</option>
                  </select>
                </div>

                <!-- Language -->
                <div class="form-group col-6">
                  <label class="form-label" for="language">Language</label>
                  <select id="language" class="form-control" name="language" [(ngModel)]="editPayload.language">
                    <option value="fr">FR (French)</option>
                    <option value="en">EN (English)</option>
                  </select>
                </div>
              </div>

              <!-- 2FA Checkbox -->
              <div class="form-group">
                <label class="checkbox-container">
                  <input type="checkbox" name="twoFaEnabled" [(ngModel)]="editPayload.twoFaEnabled">
                  <span class="checkbox-checkmark"></span>
                  <span class="checkbox-label" style="margin-left: 28px;">Require 2-Factor Authentication</span>
                </label>
              </div>

              <!-- Company Assignments -->
              <div class="company-assignments-section">
                <label class="form-label">Assigned Entities</label>
                <div class="companies-checkboxes-grid">
                  @for (company of companies(); track company.id) {
                    <label class="checkbox-container">
                      <input type="checkbox" 
                             [checked]="isCompanyAssigned(company.id!)"
                             (change)="toggleCompanyAssignment(company.id!)">
                      <span class="checkbox-checkmark"></span>
                      <span class="checkbox-label" style="margin-left: 28px;">{{ company.name }}</span>
                    </label>
                  }
                  @if (companies().length === 0) {
                    <span class="text-muted italic text-sm">No entities created yet.</span>
                  }
                </div>
              </div>

              <button type="submit" style="display: none;" #submitBtn></button>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeForm()">Cancel</button>
            <button class="btn btn-primary" [disabled]="userForm.invalid || saving()" (click)="submitBtn.click()">
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

    <!-- Password Reset Dialog -->
    @if (resetPasswordOpen()) {
      <div class="modal-overlay" (click)="closeResetPassword()">
        <div class="modal-container glass-panel" (click)="$event.stopPropagation()" style="max-width: 450px;">
          <div class="modal-header">
            <h3>Reset Password</h3>
            <button class="btn-close" (click)="closeResetPassword()">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="desc-text" style="margin-bottom: 16px;">Set a new temporary password for user <strong>{{ selectedUser()?.username }}</strong>.</p>
            <div class="form-group">
              <label class="form-label" for="new-password">New Password</label>
              <input type="password" id="new-password" class="form-control" name="newPassword" 
                     [(ngModel)]="newPassword" placeholder="Enter new password (min 6 chars)">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeResetPassword()">Cancel</button>
            <button class="btn btn-primary" [disabled]="newPassword.length < 6 || saving()" (click)="confirmResetPassword()">
              <span>Reset Password</span>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Deletion Confirm Dialog -->
    @if (showConfirmDeleteDialog()) {
      <app-confirm-dialog
        title="Delete User"
        [message]="'Are you sure you want to permanently delete user ' + selectedUser()?.username + '?'"
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
    .table-container .data-table {
      width: 100%;
      table-layout: fixed;
    }
    .table-container .data-table th,
    .table-container .data-table td {
      padding: 5px 8px;
      line-height: 1.05;
      white-space: nowrap;
      vertical-align: middle;
    }
    .table-container .data-table th {
      padding-top: 6px;
      padding-bottom: 6px;
    }
    .table-filter-row th {
      padding-top: 4px;
      padding-bottom: 4px;
    }
    .table-filter-input,
    .table-filter-select {
      padding: 4px 6px;
      min-height: 30px;
      font-size: 0.75rem;
    }
    .table-container .data-table th:nth-child(1),
    .table-container .data-table td:nth-child(1) {
      width: 120px;
    }
    .table-container .data-table th:nth-child(2),
    .table-container .data-table td:nth-child(2) {
      width: 120px;
    }
    .table-container .data-table th:nth-child(3),
    .table-container .data-table td:nth-child(3) {
      width: 240px;
      white-space: normal;
      word-break: break-word;
      overflow: visible;
      text-overflow: clip;
    }
    .table-container .data-table th:nth-child(4),
    .table-container .data-table td:nth-child(4) {
      width: 180px;
    }
    .table-container .data-table th:nth-child(9),
    .table-container .data-table td:nth-child(9) {
      width: 180px;
    }
    .lang-badge {
      background-color: var(--bg-primary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      border: 1px solid var(--border-color);
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
      gap: 4px;
      flex-wrap: wrap;
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
    .btn-reset:hover { color: var(--primary-hover); }
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
      max-width: 550px;
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

    /* Checkbox & Assignments */
    .company-assignments-section {
      margin-top: 16px;
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
    }
    .companies-checkboxes-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 8px;
    }
    /* Tags for assigned companies */
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
    
    .desc-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .text-center { text-align: center; }
    .text-bold { font-weight: 600; }
    .italic { font-style: italic; }

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
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly entityService = inject(EntityService);
  private readonly toastService = inject(ToastService);

  users = signal<UserDto[]>([]);
  companies = signal<EntityDto[]>([]);
  loading = signal(true);
  saving = signal(false);
  sortColumn: 'username' | 'surname' | 'email' | 'companies' | 'role' | 'language' | 'twoFa' | 'status' | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  filterUsername = '';
  filterFullName = '';
  filterEmail = '';
  filterCompany = 'ALL';
  filterRole = 'ALL';
  filterLanguage = 'ALL';
  filterTwoFa = 'ALL';
  filterStatus = 'ALL';

  companyOptions = computed(() => [...this.companies()].sort((left, right) => left.name.localeCompare(right.name)));

  displayedUsers = computed(() => {
    const usernameQuery = this.filterUsername.trim().toLowerCase();
    const fullNameQuery = this.filterFullName.trim().toLowerCase();
    const emailQuery = this.filterEmail.trim().toLowerCase();
    const companyFilter = this.filterCompany;
    const roleFilter = this.filterRole;
    const languageFilter = this.filterLanguage;
    const twoFaFilter = this.filterTwoFa;
    const statusFilter = this.filterStatus;

    const filtered = this.users().filter(user => {
      if (usernameQuery && !user.username.toLowerCase().includes(usernameQuery)) return false;
      if (fullNameQuery && !(user.surname || '').toLowerCase().includes(fullNameQuery)) return false;
      if (emailQuery && !user.email.toLowerCase().includes(emailQuery)) return false;
      if (companyFilter !== 'ALL' && !user.assignedCompanyIds.includes(Number(companyFilter))) return false;
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
      if (languageFilter !== 'ALL' && user.language !== languageFilter) return false;
      if (twoFaFilter !== 'ALL') {
        const enabled = twoFaFilter === 'ENABLED';
        if (user.twoFaEnabled !== enabled) return false;
      }
      if (statusFilter !== 'ALL') {
        const active = statusFilter === 'ACTIVE';
        if (user.isActive !== active) return false;
      }
      return true;
    });

    if (!this.sortColumn) {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      const direction = this.sortDirection === 'asc' ? 1 : -1;
      let comparison = 0;

      switch (this.sortColumn) {
        case 'surname':
          comparison = (left.surname || '').localeCompare(right.surname || '');
          break;
        case 'email':
          comparison = left.email.localeCompare(right.email);
          break;
        case 'companies':
          comparison = left.assignedCompanyIds.join(',').localeCompare(right.assignedCompanyIds.join(','));
          break;
        case 'role':
          comparison = left.role.localeCompare(right.role);
          break;
        case 'language':
          comparison = left.language.localeCompare(right.language);
          break;
        case 'twoFa':
          comparison = Number(left.twoFaEnabled) - Number(right.twoFaEnabled);
          break;
        case 'status':
          comparison = Number(left.isActive) - Number(right.isActive);
          break;
        case 'username':
        default:
          comparison = left.username.localeCompare(right.username);
          break;
      }

      return comparison * direction;
    });
  });

  // Form handling
  formOpen = signal(false);
  isEditMode = signal(false);
  editPayload: UserDto = this.getBlankUser();

  // Reset password modal handling
  resetPasswordOpen = signal(false);
  selectedUser = signal<UserDto | null>(null);
  newPassword = '';

  // Delete confirm dialog handling
  showConfirmDeleteDialog = signal(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    // Fetch users and active entities
    forkJoin({
      usersList: this.userService.getAll(),
      entitiesList: this.entityService.getActive()
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.usersList.success) {
          this.users.set(res.usersList.data || []);
        }
        if (res.entitiesList.success) {
          this.companies.set(res.entitiesList.data || []);
        }
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Error', 'Failed to retrieve administrative data.');
      }
    });
  }

  getBlankUser(): UserDto {
    return {
      username: '',
      surname: '',
      email: '',
      role: 'user',
      language: 'fr',
      isActive: false,
      twoFaEnabled: false,
      assignedCompanyIds: []
    };
  }

  getRoleBadgeClass(role: string): string {
    switch (role?.toUpperCase()) {
      case 'SUPERUSER': return 'badge-danger';
      case 'ADMIN': return 'badge-warning';
      default: return 'badge-info';
    }
  }

  getCompanyName(id: number): string {
    const comp = this.companies().find(c => c.id === id);
    return comp ? comp.name : `Entity #${id}`;
  }

  toggleActive(user: UserDto) {
    if (!user.id) return;
    const wasActive = !!user.isActive;
    this.userService.toggleActive(user.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadData();
          this.toastService.success(
            'User Updated', 
            `User "${user.username}" has been ${wasActive ? 'deactivated' : 'activated'}.`
          );
        } else {
          this.toastService.error('Error', res.message || 'Failed to toggle user status.');
        }
      },
      error: (err) => {
        this.toastService.error('Error', err.error?.message || 'Could not update user status.');
      }
    });
  }

  openCreateForm() {
    this.isEditMode.set(false);
    this.editPayload = this.getBlankUser();
    this.formOpen.set(true);
  }

  openEditForm(user: UserDto) {
    this.isEditMode.set(true);
    // clone user
    this.editPayload = { ...user, assignedCompanyIds: [...user.assignedCompanyIds] };
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  // Company selection logic
  isCompanyAssigned(id: number): boolean {
    return this.editPayload.assignedCompanyIds.includes(id);
  }

  toggleCompanyAssignment(id: number) {
    const list = [...this.editPayload.assignedCompanyIds];
    const index = list.indexOf(id);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(id);
    }
    this.editPayload.assignedCompanyIds = list;
  }

  saveUser() {
    this.saving.set(true);
    if (this.isEditMode()) {
      // Update
      this.userService.update(this.editPayload.id!, this.editPayload).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Success', `User "${this.editPayload.username}" updated successfully.`);
            this.formOpen.set(false);
            this.loadData();
          } else {
            this.toastService.error('Save Failed', res.message || 'Failed to update user.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.toastService.error('Error', err.error?.message || 'Error occurred while saving modifications.');
        }
      });
    } else {
      // Create
      this.userService.create(this.editPayload).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Success', `User "${this.editPayload.username}" created successfully.`);
            this.formOpen.set(false);
            this.loadData();
          } else {
            this.toastService.error('Creation Failed', res.message || 'Failed to create user.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.toastService.error('Error', err.error?.message || 'Error occurred while creating user.');
        }
      });
    }
  }

  // Password reset handlers
  openResetPassword(user: UserDto) {
    this.selectedUser.set(user);
    this.newPassword = '';
    this.resetPasswordOpen.set(true);
  }

  closeResetPassword() {
    this.resetPasswordOpen.set(false);
    this.selectedUser.set(null);
  }

  confirmResetPassword() {
    const user = this.selectedUser();
    if (!user || !user.id) return;

    this.saving.set(true);
    this.userService.resetPassword(user.id, this.newPassword).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.resetPasswordOpen.set(false);
        if (res.success) {
          this.toastService.success('Password Reset', `Password for user "${user.username}" has been updated.`);
        } else {
          this.toastService.error('Reset Failed', res.message || 'Could not reset password.');
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.resetPasswordOpen.set(false);
        this.toastService.error('Error', err.error?.message || 'Error occurred while resetting password.');
      }
    });
  }

  // Deletion logic
  deleteUser(user: UserDto) {
    this.selectedUser.set(user);
    this.showConfirmDeleteDialog.set(true);
  }

  onConfirmDelete() {
    const user = this.selectedUser();
    this.showConfirmDeleteDialog.set(false);
    if (!user || !user.id) return;

    this.loading.set(true);
    this.userService.delete(user.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('Deleted', `User "${user.username}" deleted successfully.`);
          this.loadData();
        } else {
          this.toastService.error('Delete Failed', res.message || 'Could not delete user.');
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.toastService.error('Error', err.error?.message || 'Error occurred while deleting user.');
        this.loading.set(false);
      }
    });
  }

  cancelDelete() {
    this.showConfirmDeleteDialog.set(false);
    this.selectedUser.set(null);
  }

  toggleSort(column: 'username' | 'surname' | 'email' | 'companies' | 'role' | 'language' | 'twoFa' | 'status') {
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
