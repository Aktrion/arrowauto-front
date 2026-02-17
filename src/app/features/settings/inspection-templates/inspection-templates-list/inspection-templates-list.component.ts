import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../../../shared/icons';
import { InspectionTemplate, InspectionTemplatesService } from '../services/inspection-templates.service';
import { InspectionTemplateEditorComponent } from '../components/inspection-template-editor/inspection-template-editor.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-inspection-templates-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, InspectionTemplateEditorComponent],
  template: `
    @if (view() === 'list') {
      <div class="form-section">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="form-section-title">Inspection Templates</h3>
            <p class="form-section-description">Manage vehicle inspection templates</p>
          </div>
          <button class="btn-premium" (click)="createTemplate()">
            <lucide-icon [name]="icons.Plus" class="h-5 w-5 mr-2"></lucide-icon>
            Add Template
          </button>
        </div>

        <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div class="relative w-full md:max-w-md">
            <lucide-icon
              [name]="icons.Search"
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40"
            ></lucide-icon>
            <input
              type="text"
              class="input input-bordered w-full pl-9"
              placeholder="Search templates..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange($event)"
            />
          </div>
          <div class="text-sm text-base-content/60">{{ total() }} results</div>
        </div>

        <div class="space-y-3">
          @if (loading()) {
            <div class="rounded-xl border border-base-200 bg-base-100 p-6 text-center text-base-content/60">
              Loading templates...
            </div>
          } @else {
            @for (template of templates(); track template._id) {
              <div
                class="flex items-center gap-4 p-4 bg-base-200/50 rounded-xl hover:bg-base-200 transition-colors"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold"
                >
                  <lucide-icon [name]="icons.FileText" class="h-6 w-6"></lucide-icon>
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-base-content">{{ template.name }}</p>
                  <p class="text-sm text-base-content/60">
                    <span [class]="template.active ? 'text-success' : 'text-error'">
                      {{ template.active ? 'Active' : 'Inactive' }}
                    </span>
                    • {{ template.inspectionBlockIds?.length || 0 }} blocks
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="btn btn-ghost btn-sm btn-square hover:bg-primary/10 hover:text-primary"
                    (click)="editTemplate(template._id)"
                  >
                    <lucide-icon [name]="icons.Pencil" class="h-4 w-4"></lucide-icon>
                  </button>
                  <button
                    class="btn btn-ghost btn-sm btn-square hover:bg-error/10 hover:text-error"
                    (click)="deleteTemplate(template._id)"
                  >
                    <lucide-icon [name]="icons.Trash2" class="h-4 w-4"></lucide-icon>
                  </button>
                </div>
              </div>
            }
          }

          @if (!loading() && templates().length === 0) {
            <div class="text-center py-8 text-base-content/60">No templates found.</div>
          }
        </div>

        @if (!loading() && totalPages() > 1) {
          <div class="mt-5 flex items-center justify-between">
            <button class="btn btn-sm btn-outline" (click)="prevPage()" [disabled]="page() <= 1">
              <lucide-icon [name]="icons.ChevronLeft" class="h-4 w-4"></lucide-icon>
              Previous
            </button>
            <div class="text-sm text-base-content/70">Page {{ page() }} of {{ totalPages() }}</div>
            <button
              class="btn btn-sm btn-outline"
              (click)="nextPage()"
              [disabled]="page() >= totalPages()"
            >
              Next
              <lucide-icon [name]="icons.ChevronRight" class="h-4 w-4"></lucide-icon>
            </button>
          </div>
        }
      </div>
    } @else {
      <app-inspection-template-editor
        [templateId]="selectedTemplateId()"
        (cancel)="view.set('list')"
        (saved)="onSaved()"
        (created)="onCreated($event)"
      ></app-inspection-template-editor>
    }
  `,
})
export class InspectionTemplatesListComponent {
  icons = ICONS;
  private service = inject(InspectionTemplatesService);
  private notificationService = inject(NotificationService);

  templates = signal<InspectionTemplate[]>([]);
  loading = signal(false);
  total = signal(0);
  totalPages = signal(1);
  page = signal(1);
  readonly limit = 8;
  searchTerm = '';

  view = signal<'list' | 'editor'>('list');
  selectedTemplateId = signal<string | null>(null);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  constructor() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.loading.set(true);
    this.service
      .search({
        page: this.page(),
        limit: this.limit,
        search: this.searchTerm.trim() || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      .subscribe({
        next: (res) => {
          this.templates.set(res.data);
          this.total.set(res.total);
          this.totalPages.set(Math.max(1, res.totalPages || 1));
          this.loading.set(false);
        },
        error: () => {
          this.templates.set([]);
          this.total.set(0);
          this.totalPages.set(1);
          this.loading.set(false);
          this.notificationService.error('Failed to load templates.');
        },
      });
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.page.set(1);
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => this.loadTemplates(), 300);
  }

  prevPage() {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.loadTemplates();
  }

  nextPage() {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
    this.loadTemplates();
  }

  createTemplate() {
    this.selectedTemplateId.set(null);
    this.view.set('editor');
  }

  editTemplate(id: string) {
    this.selectedTemplateId.set(id);
    this.view.set('editor');
  }

  deleteTemplate(id: string) {
    if (confirm('Are you sure you want to delete this template?')) {
      this.service.delete(id).subscribe({
        next: () => {
          if (this.templates().length === 1 && this.page() > 1) {
            this.page.update((p) => p - 1);
          }
          this.loadTemplates();
          this.notificationService.success('Template deleted successfully.');
        },
        error: () => this.notificationService.error('Failed to delete template.'),
      });
    }
  }

  onSaved() {
    this.view.set('list');
    this.loadTemplates();
    this.notificationService.success('Template updated successfully.');
  }

  onCreated(id: string) {
    this.selectedTemplateId.set(id);
    this.loadTemplates();
    this.notificationService.success('Template created successfully.');
  }
}
