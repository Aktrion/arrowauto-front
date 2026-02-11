import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../../../shared/icons';
import { InspectionTemplatesService } from '../services/inspection-templates.service';
import { InspectionTemplateEditorComponent } from '../components/inspection-template-editor/inspection-template-editor.component';

@Component({
  selector: 'app-inspection-templates-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, InspectionTemplateEditorComponent],
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

        <div class="space-y-3">
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
          @if (templates().length === 0) {
            <div class="text-center py-8 text-base-content/60">
              No templates found. Create one to get started.
            </div>
          }
        </div>
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

  templates = this.service.templates;
  view = signal<'list' | 'editor'>('list');
  selectedTemplateId = signal<string | null>(null);

  constructor() {
    this.service.getAll();
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
      this.service.delete(id).subscribe();
    }
  }

  onSaved() {
    this.view.set('list');
    this.service.getAll();
  }

  onCreated(id: string) {
    this.selectedTemplateId.set(id);
    // View remains 'editor', but we refresh the list in background if needed,
    // though strictly speaking we don't need to refresh the list until we go back to it.
    // However, refreshing it ensures that if we cancel, the new item is there.
    this.service.getAll();
  }
}
