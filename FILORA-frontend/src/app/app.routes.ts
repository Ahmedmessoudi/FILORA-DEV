import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dms/temp-documents',
    pathMatch: 'full'
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('./pages/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dms/temp-documents',
        loadComponent: () => import('./pages/dms/temp-documents/temp-documents.component').then(m => m.TempDocumentsComponent)
      },
      {
        path: 'dms/entity/:companyId',
        loadComponent: () => import('./pages/dms/entity-documents/entity-documents.component').then(m => m.EntityDocumentsComponent)
      },
      {
        path: 'dms/entity/:companyId/doctype/:doctypeId',
        loadComponent: () => import('./pages/dms/entity-documents/entity-documents.component').then(m => m.EntityDocumentsComponent)
      },
      {
        path: 'tools/users',
        loadComponent: () => import('./pages/tools/users/users.component').then(m => m.UsersComponent),
        data: { roles: ['ADMIN', 'SUPERUSER'] }
      },
      {
        path: 'tools/entities',
        loadComponent: () => import('./pages/tools/entities/entities.component').then(m => m.EntitiesComponent),
        data: { roles: ['ADMIN', 'SUPERUSER'] }
      },
      {
        path: 'tools/doctypes',
        loadComponent: () => import('./pages/tools/doctypes/doctypes.component').then(m => m.DocTypesComponent),
        data: { roles: ['ADMIN', 'SUPERUSER'] }
      },
      {
        path: 'tools/partners',
        loadComponent: () => import('./pages/tools/partners/partners.component').then(m => m.PartnersComponent),
        data: { roles: ['ADMIN', 'SUPERUSER'] }
      },
      {
        path: 'tools/partner-types',
        loadComponent: () => import('./pages/tools/partner-types/partner-types.component').then(m => m.PartnerTypesComponent),
        data: { roles: ['ADMIN', 'SUPERUSER'] }
      },

      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
        data: { roles: ['SUPERUSER'] }
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dms/temp-documents'
  }
];
