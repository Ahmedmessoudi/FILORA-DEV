import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { EntityService, EntityDto } from '../../core/services/entity.service';
import { DocTypeService, DocTypeDto } from '../../core/services/doctype.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { forkJoin, filter } from 'rxjs';

interface EntityTreeItem extends EntityDto {
  docTypes: DocTypeDto[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <aside class="sidebar glass-panel" [class.sidebar-open]="isOpen">
      <!-- Temp Documents Link -->
      <div class="sidebar-section">
        <a routerLink="/dms/temp-documents" 
           routerLinkActive="active" 
           class="sidebar-link temp-docs-link"
           (click)="onLinkClick()">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
            <path d="M140-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h240l80 80h360q24 0 42 18t18 42v400q0 24-18 42t-42 18H140Zm0-580v520h680v-400H420l-80-80H140Zm0 0v520-520Z"/>
          </svg>
          <span class="link-label">{{ 'sidebar.temp_docs' | translate }}</span>
        </a>
      </div>

      <!-- Entities & DocTypes Section -->
      <div class="sidebar-section">
        <div class="section-title">{{ 'sidebar.companies' | translate }}</div>
        
        @if (loading()) {
          <div class="sidebar-loading">
            <div class="spinner-sm"></div>
            <span>{{ 'sidebar.loading' | translate }}</span>
          </div>
        } @else if (entityTree().length === 0) {
          <div class="sidebar-empty">
            <p>{{ 'sidebar.no_companies' | translate }}</p>
            <p class="sub-text">{{ 'sidebar.add_companies' | translate }}</p>
          </div>
        } @else {
          <ul class="entity-list">
            @for (entity of entityTree(); track entity.id) {
              <li class="entity-item">
                <div class="entity-header" (click)="toggleEntity(entity)">
                  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" 
                       fill="currentColor" class="chevron-icon" [class.chevron-expanded]="entity.expanded">
                    <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/>
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="var(--primary)" class="entity-icon">
                    <path d="M120-120v-560l280-160 280 160v120h160v440H120Zm80-80h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 320h80v-80h-80v80Zm0-160h80v-80h-80v80Z"/>
                  </svg>
                  <span class="entity-name" [title]="entity.name">{{ entity.name }}</span>
                </div>

                <!-- Associated DocTypes (Collapsible) -->
                @if (entity.expanded) {
                  <ul class="doctype-list">
                    @if (entity.docTypes.length === 0) {
                      <li class="doctype-empty">{{ 'sidebar.no_folders' | translate }}</li>
                    } @else {
                      @for (docType of entity.docTypes; track docType.id) {
                        <li>
                          <a [routerLink]="['/dms/entity', entity.id, 'doctype', docType.id]"
                             routerLinkActive="active"
                             class="sidebar-link doctype-link"
                             (click)="onLinkClick()">
                            <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor" class="folder-icon">
                              <path d="M280-120q-33 0-56.5-23.5T200-200v-520q0-33 23.5-56.5T280-800h200l80 80h120q33 0 56.5 23.5T760-640v440q0 33-23.5 56.5T680-120H280Z"/>
                            </svg>
                            <span class="doctype-name">{{ docType.name }}</span>
                          </a>
                        </li>
                      }
                    }
                  </ul>
                }
              </li>
            }
          </ul>
        }
      </div>
    </aside>
    <!-- resizer handled inside component to allow user resizing the sidebar -->
    <div class="sidebar-resizer" (mousedown)="startResize($event)" title="Resize sidebar" role="separator" aria-orientation="vertical"></div>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-width);
      position: fixed;
      top: var(--header-height);
      bottom: 0;
      left: 0;
      border-right: 1px solid var(--border-color);
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      z-index: 99;
      overflow-y: auto;
      transition: transform var(--transition-normal);
    }
    .sidebar-resizer {
      position: fixed;
      top: var(--header-height);
      left: calc(var(--sidebar-width) - 4px);
      width: 8px;
      height: calc(100% - var(--header-height));
      cursor: col-resize;
      z-index: 200;
    }
    .sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-left: 12px;
      margin-bottom: 8px;
    }
    .sidebar-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 0.95rem;
      font-weight: 500;
      transition: all var(--transition-fast);
      cursor: pointer;
    }
    .sidebar-link:hover {
      background-color: var(--bg-primary);
      color: var(--text-primary);
    }
    .sidebar-link.active {
      background-color: var(--primary-light);
      color: var(--primary);
    }
    .temp-docs-link {
      border: 1px dashed var(--border-color);
    }
    .temp-docs-link.active {
      border-color: transparent;
    }
    .entity-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .entity-item {
      display: flex;
      flex-direction: column;
    }
    .entity-header {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      user-select: none;
      transition: background var(--transition-fast);
    }
    .entity-header:hover {
      background-color: var(--bg-primary);
    }
    .chevron-icon {
      color: var(--text-muted);
      margin-right: 4px;
      transition: transform var(--transition-fast);
    }
    .chevron-expanded {
      transform: rotate(90deg);
    }
    .entity-icon {
      margin-right: 10px;
    }
    .entity-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .doctype-list {
      list-style: none;
      margin-left: 28px;
      padding-left: 8px;
      border-left: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
      animation: expand-in 0.25s ease-out;
    }
    .doctype-link {
      padding: 8px 12px;
      font-size: 0.9rem;
      gap: 10px;
    }
    .folder-icon {
      color: var(--text-muted);
    }
    .doctype-link.active .folder-icon {
      color: var(--primary);
    }
    .doctype-empty {
      padding: 8px 12px;
      font-size: 0.85rem;
      color: var(--text-muted);
      font-style: italic;
    }
    .sidebar-loading, .sidebar-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 12px;
      color: var(--text-secondary);
      font-size: 0.9rem;
      text-align: center;
      gap: 10px;
    }
    .sidebar-empty .sub-text {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .spinner-sm {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-color);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes expand-in {
      from { opacity: 0; max-height: 0; overflow: hidden; }
      to { opacity: 1; max-height: 500px; }
    }

    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
        box-shadow: var(--shadow-lg);
        background: var(--bg-secondary);
        z-index: 101;
      }
      .sidebar.sidebar-open {
        transform: translateX(0);
      }
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  private readonly entityService = inject(EntityService);
  private readonly docTypeService = inject(DocTypeService);
  private readonly router = inject(Router);

  entityTree = signal<EntityTreeItem[]>([]);
  loading = signal(true);

  ngOnInit() {
    // apply stored sidebar width if present
    const saved = localStorage.getItem('filora_sidebar_width');
    if (saved) {
      document.documentElement.style.setProperty('--sidebar-width', `${saved}px`);
    }

    this.loadWorkspaceTree();

    // Re-load sidebar data when router navigation finishes (e.g. settings changed, new items created)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Reload on navigation changes if tools pages were visited, to keep sidebar in sync
      if (this.router.url.includes('/tools/') || this.router.url.includes('/settings')) {
        this.loadWorkspaceTree();
      }
    });
  }

  ngOnDestroy() {
    // nothing persistent to clean for now; resize listeners remove themselves on mouseup
  }

  startResize(event: MouseEvent) {
    event.preventDefault();
    const root = document.documentElement;
    const startX = event.clientX;
    const initialWidth = parseInt(getComputedStyle(root).getPropertyValue('--sidebar-width')) || 220;

    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(160, Math.min(420, initialWidth + delta));
      root.style.setProperty('--sidebar-width', `${newWidth}px`);
    };

    const onUp = () => {
      const finalWidth = parseInt(getComputedStyle(root).getPropertyValue('--sidebar-width')) || initialWidth;
      localStorage.setItem('filora_sidebar_width', String(finalWidth));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  loadWorkspaceTree() {
    this.loading.set(true);
    // Fetch active entities and all doctypes
    forkJoin({
      entities: this.entityService.getActive(),
      docTypes: this.docTypeService.getAll()
    }).subscribe({
      next: (res) => {
        if (res.entities.success && res.docTypes.success) {
          const entities: EntityDto[] = res.entities.data;
          const docTypes: DocTypeDto[] = res.docTypes.data;

          // For each doctype, we need to fetch which companies it is assigned to.
          // Since we want this to load efficiently, let's fetch the mappings.
          const entityRequests = docTypes.map(dt => 
            this.docTypeService.getAssignedEntities(dt.id!)
          );

          if (entityRequests.length === 0) {
            // No doctypes seeded
            this.entityTree.set(entities.map(e => ({ ...e, docTypes: [], expanded: false })));
            this.loading.set(false);
            return;
          }

          forkJoin(entityRequests).subscribe({
            next: (assignedEntitiesResults) => {
              // Map each doctype to its assigned entity IDs
              const doctypeMappings = docTypes.map((dt, index) => {
                const assigned = assignedEntitiesResults[index];
                const entityIds = assigned.success ? assigned.data.map((e: any) => e.id) : [];
                return { docType: dt, entityIds };
              });

              // Construct the tree
              const tree: EntityTreeItem[] = entities.map(entity => {
                // Find doctypes assigned to this company
                const assignedDocTypes = doctypeMappings
                  .filter(m => m.entityIds.includes(entity.id))
                  .map(m => m.docType);

                return {
                  ...entity,
                  docTypes: assignedDocTypes,
                  expanded: true // Expand by default for user convenience
                };
              });

              this.entityTree.set(tree);
              this.loading.set(false);
            },
            error: () => {
              // Fallback if mapping request fails
              this.entityTree.set(entities.map(e => ({ ...e, docTypes: [], expanded: false })));
              this.loading.set(false);
            }
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  toggleEntity(entity: EntityTreeItem) {
    entity.expanded = !entity.expanded;
    // Trigger signal update to re-render
    this.entityTree.update(tree => [...tree]);
    this.router.navigate(['/dms/entity', entity.id]);
  }

  onLinkClick() {
    this.closeSidebar.emit();
  }
}
