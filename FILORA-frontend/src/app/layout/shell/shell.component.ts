import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent, ToastContainerComponent],
  template: `
    <div class="shell-layout">
      <!-- Top Navigation Navbar -->
      <app-navbar (toggleMenu)="toggleSidebar()"></app-navbar>

      <div class="shell-body">
        <!-- Sidebar Navigation Tree -->
        <app-sidebar [isOpen]="sidebarOpen()" (closeSidebar)="closeSidebar()"></app-sidebar>

        <!-- Overlay backdrop on mobile when sidebar is open -->
        @if (sidebarOpen()) {
          <div class="sidebar-backdrop" (click)="closeSidebar()" role="presentation"></div>
        }

        <!-- Main Content Area -->
        <main class="shell-content">
          <div class="content-wrapper">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>

      <!-- Root Toast Notification Container -->
      <app-toast-container></app-toast-container>
    </div>
  `,
  styles: [`
    .shell-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .shell-body {
      display: flex;
      flex: 1;
      height: calc(100vh - var(--header-height));
      margin-top: var(--header-height);
      position: relative;
      min-height: 0;
    }
    .shell-content {
      flex: 1;
      margin-left: var(--sidebar-width);
      height: 100%;
      overflow: hidden; /* disable page scroll; inner components will scroll tables */
      background-color: var(--bg-primary);
      transition: margin-left var(--transition-normal);
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .content-wrapper {
      padding: 24px;
      /* allow children with flex:1 to shrink properly and enable internal scrolling */
      min-height: 0;
      width: 100%;
      max-width: none;
      margin: 0;
      display: flex;
      flex-direction: column;
      flex: 1; /* allow pages to stretch so tables can reach bottom */
    }

    /* Mobile sidebar backdrop */
    .sidebar-backdrop {
      display: none;
      position: fixed;
      top: var(--header-height);
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.4);
      z-index: 100;
      backdrop-filter: blur(2px);
      animation: fade-in 0.2s ease-out;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (max-width: 768px) {
      .shell-content {
        margin-left: 0;
      }
      .content-wrapper {
        padding: 16px;
      }
      .sidebar-backdrop {
        display: block;
      }
    }
  `]
})
export class ShellComponent {
  sidebarOpen = signal(false);

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }
}
