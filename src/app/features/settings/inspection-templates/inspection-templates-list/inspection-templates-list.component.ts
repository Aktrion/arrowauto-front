import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseListDirective } from '@core/directives/base-list.directive';
import { DataGridComponent } from '@shared/components/data-grid/data-grid.component';
import { ColumnDef } from '@shared/components/data-grid/data-grid.interface';
import { ICONS } from '@shared/icons';
import { InspectionTemplate } from '@features/settings/inspection-templates/models/inspection-template.model';
import { InspectionTemplatesService } from '@features/settings/inspection-templates/services/inspection-templates.service';
import { InspectionTemplateEditorComponent } from '@features/settings/inspection-templates/components/inspection-template-editor/inspection-template-editor.component';
import { ToastService } from '@core/services/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-inspection-templates-list',
  standalone: true,
  imports: [CommonModule, DataGridComponent, InspectionTemplateEditorComponent],
  template: `
    @if (view() === 'list') {
      <app-data-grid
        [config]="gridConfig"
        (stateChange)="handleGridStateChange($event)"
        (selectionChange)="handleSelectionChanged($event)"
        (create)="handleCreate()"
        (edit)="handleEdit($event)"
        (delete)="handleDelete($event)"
      />
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
export class InspectionTemplatesListComponent extends BaseListDirective<
  InspectionTemplate,
  Partial<InspectionTemplate>,
  Partial<InspectionTemplate>
> {
  icons = ICONS;
  private templatesService = inject(InspectionTemplatesService);
  private notificationService = inject(ToastService);
  private translate = inject(TranslateService);

  view = signal<'list' | 'editor'>('list');
  selectedTemplateId = signal<string | null>(null);

  constructor() {
    super(inject(InspectionTemplatesService));
    this.gridConfig = {
      ...this.gridConfig,
      showNewButton: true,
      showEditButton: true,
      showDeleteButton: true,
      selectable: false,
      storageKey: 'inspection_templates_grid',
    };
  }

  protected getTitle(): string {
    return 'SETTINGS.INSPECTION_TEMPLATES';
  }

  protected getColumnDefinitions(): ColumnDef[] {
    return [
      { field: 'name', headerName: 'Name', type: 'string', sortable: true, filterable: true, dontTranslate: true },
      {
        field: 'active',
        headerName: 'Status',
        type: 'boolean',
        sortable: true,
        filterable: true,
        dontTranslate: true,
        cellRenderer: ({ value }) => (value ? 'Active' : 'Inactive'),
      },
      {
        field: 'inspectionBlockIds',
        headerName: 'Blocks',
        type: 'number',
        sortable: false,
        filterable: false,
        dontTranslate: true,
        cellRenderer: ({ value }) => String((value || []).length || 0),
      },
      { field: 'updatedAt', headerName: 'Updated', type: 'date', sortable: true, filterable: false, dontTranslate: true },
    ];
  }

  protected override onCreate(): void {
    this.selectedTemplateId.set(null);
    this.view.set('editor');
  }

  protected override onEdit(item: InspectionTemplate): void {
    if (!item?._id) return;
    this.selectedTemplateId.set(item._id);
    this.view.set('editor');
  }

  protected override onDelete(item: InspectionTemplate): void {
    if (!item?._id) return;
    if (!confirm(this.translate.instant('SETTINGS.DELETE_TEMPLATE_CONFIRM'))) return;

    this.templatesService.deleteById(item._id).subscribe({
      next: () => {
        this.loadItems();
        this.notificationService.success(this.translate.instant('SETTINGS.TEMPLATE_DELETED'));
      },
      error: () => this.notificationService.error(this.translate.instant('SETTINGS.TEMPLATE_DELETE_FAILED')),
    });
  }

  onSaved() {
    this.view.set('list');
    this.loadItems();
    this.notificationService.success(this.translate.instant('SETTINGS.TEMPLATE_UPDATED'));
  }

  onCreated(id: string) {
    this.selectedTemplateId.set(id);
    this.view.set('list');
    this.loadItems();
    this.notificationService.success(this.translate.instant('SETTINGS.TEMPLATE_CREATED'));
  }
}
