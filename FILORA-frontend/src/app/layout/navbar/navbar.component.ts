import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <header class="navbar glass-panel">
      <div class="navbar-left">
        <!-- Burger menu toggle for mobile -->
        <button class="burger-menu-btn" (click)="toggleMenu.emit()" aria-label="Toggle Navigation Menu">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
            <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/>
          </svg>
        </button>

        <!-- Brand Logo -->
        <a routerLink="/" class="brand-logo">
          <span class="logo-text-gradient">Filora</span>
          <span class="logo-subtext">DMS</span>
        </a>
      </div>

      <div class="navbar-right">
        <!-- Language Toggle -->
        <button class="lang-toggle-btn" (click)="toggleLanguage()" [title]="translationService.currentLang() === 'fr' ? 'Switch to English' : 'Passer au français'">
          {{ translationService.currentLang().toUpperCase() }}
        </button>

        <!-- Theme Toggle -->
        <button class="theme-toggle-btn" (click)="toggleTheme()" [title]="isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
          @if (isDark()) {
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T440-660q0 90 63 153t153 63q52 0 98.5-24.5T831-734q2 13 3 26.5t1 27.5q0 150-105 255T480-120Z"/></svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-57 96 101-52 53Zm492 496-97-101 53-52 101 97-57 56Zm-99-496 97-101 56 57-101 96-52-52ZM155-207l97-101 52 52-96 101-53-52Z"/></svg>
          }
        </button>

        <!-- Tools Dropdown (Admin & Superuser only) -->
        @if (authService.isAdmin()) {
          <div class="dropdown-wrapper">
            <button class="nav-btn dropdown-trigger" (click)="toggleToolsDropdown()">
              <span>{{ 'nav.tools' | translate }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M480-360 280-560h400L480-360Z"/></svg>
            </button>
            @if (showTools()) {
              <div class="dropdown-menu glass-panel" (mouseleave)="showTools.set(false)">
                <a routerLink="/tools/users" class="dropdown-item" (click)="showTools.set(false)">{{ 'nav.users' | translate }}</a>
                <a routerLink="/tools/entities" class="dropdown-item" (click)="showTools.set(false)">{{ 'nav.entities' | translate }}</a>
                <a routerLink="/tools/doctypes" class="dropdown-item" (click)="showTools.set(false)">{{ 'nav.doctypes' | translate }}</a>
                <a routerLink="/tools/partners" class="dropdown-item" (click)="showTools.set(false)">{{ 'nav.partners' | translate }}</a>
                <a routerLink="/tools/partner-types" class="dropdown-item" (click)="showTools.set(false)">{{ 'nav.partnertypes' | translate }}</a>
                @if (authService.isSuperuser()) {
                  <hr class="dropdown-divider">
                  <a routerLink="/settings" class="dropdown-item setting-link" (click)="showTools.set(false)">{{ 'nav.settings' | translate }}</a>
                }
              </div>
            }
          </div>
        }

        <!-- Profile Menu -->
        <div class="dropdown-wrapper">
          <button class="profile-trigger" (click)="toggleProfileDropdown()">
            <div class="avatar">{{ authService.currentUser().substring(0, 2).toUpperCase() }}</div>
            <span class="username">{{ authService.currentUser() }}</span>
          </button>
          @if (showProfile()) {
            <div class="dropdown-menu profile-menu glass-panel" (mouseleave)="showProfile.set(false)">
              <div class="menu-header">
                <p class="user-role-badge">{{ authService.session()?.role }}</p>
              </div>
              <button class="dropdown-item logout-btn" (click)="logout()">
                <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/></svg>
                <span>{{ 'nav.logout' | translate }}</span>
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      height: var(--header-height);
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
    }
    .navbar-left, .navbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .burger-menu-btn {
      display: none;
      color: var(--text-primary);
      cursor: pointer;
    }
    .brand-logo {
      display: flex;
      align-items: baseline;
      gap: 4px;
      font-size: 1.5rem;
      font-weight: 700;
      font-family: var(--font-heading);
      letter-spacing: -0.5px;
    }
    .logo-text-gradient {
      background: linear-gradient(135deg, var(--primary), #0ea5e9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .logo-subtext {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .theme-toggle-btn {
      padding: 8px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all var(--transition-fast);
    }
    .theme-toggle-btn:hover {
      background-color: var(--bg-primary);
      color: var(--text-primary);
    }
    .lang-toggle-btn {
      padding: 6px 10px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }
    .lang-toggle-btn:hover {
      background-color: var(--bg-primary);
      color: var(--text-primary);
      border-color: var(--text-muted);
    }
    .nav-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-md);
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.95rem;
      transition: all var(--transition-fast);
    }
    .nav-btn:hover {
      background-color: var(--bg-primary);
      color: var(--text-primary);
    }
    .dropdown-wrapper {
      position: relative;
    }
    .dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 200px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-lg);
      padding: 6px 0;
      display: flex;
      flex-direction: column;
      animation: dropdown-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .dropdown-item {
      padding: 10px 16px;
      font-size: 0.925rem;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: left;
      transition: all var(--transition-fast);
    }
    .dropdown-item:hover {
      background-color: var(--primary-light);
      color: var(--primary);
    }
    .dropdown-divider {
      border: 0;
      border-top: 1px solid var(--border-color);
      margin: 6px 0;
    }
    .setting-link {
      font-weight: 500;
    }
    .profile-trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
    }
    .profile-trigger:hover {
      background-color: var(--bg-primary);
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      background-color: var(--primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.85rem;
    }
    .username {
      font-weight: 500;
      font-size: 0.95rem;
      color: var(--text-primary);
    }
    .profile-menu {
      min-width: 220px;
    }
    .menu-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 6px;
    }
    .user-role-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--primary);
      background-color: var(--primary-light);
      padding: 3px 8px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .logout-btn {
      color: var(--error);
    }
    .logout-btn:hover {
      background-color: var(--error-light);
      color: var(--error);
    }

    @keyframes dropdown-in {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .burger-menu-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
      }
      .username {
        display: none;
      }
      .navbar {
        padding: 0 16px;
      }
    }
  `]
})
export class NavbarComponent {
  @Output() toggleMenu = new EventEmitter<void>();

  protected readonly authService = inject(AuthService);
  protected readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);

  showTools = signal(false);
  showProfile = signal(false);
  isDark = signal(false);

  constructor() {
    // Check if dark theme was saved in localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.classList.add('dark-theme');
      this.isDark.set(true);
    }
  }

  toggleTheme() {
    if (this.isDark()) {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
      this.isDark.set(false);
    } else {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      this.isDark.set(true);
    }
  }

  toggleToolsDropdown() {
    this.showTools.update(v => !v);
    this.showProfile.set(false);
  }

  toggleProfileDropdown() {
    this.showProfile.update(v => !v);
    this.showTools.set(false);
  }

  logout() {
    this.showProfile.set(false);
    this.authService.logout();
  }

  toggleLanguage() {
    const nextLang = this.translationService.currentLang() === 'fr' ? 'en' : 'fr';
    this.translationService.setLanguage(nextLang);
  }
}
