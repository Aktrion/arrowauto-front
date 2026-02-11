import { Component, Input, Output, EventEmitter, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  InspectionTemplatesService,
  CreateInspectionTemplateDto,
} from '../../services/inspection-templates.service';
import { InspectionBlocksService, InspectionBlock } from '../../services/inspection-blocks.service';
import { InspectionBlockEditorComponent } from '../inspection-block-editor/inspection-block-editor.component';
import { ICONS } from '../../../../../shared/icons';

@Component({
  selector: 'app-inspection-template-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, InspectionBlockEditorComponent],
  templateUrl: './inspection-template-editor.component.html',
})
export class InspectionTemplateEditorComponent {
  @Input() templateId: string | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() created = new EventEmitter<string>();

  icons = ICONS;

  private templatesService = inject(InspectionTemplatesService);
  private blocksService = inject(InspectionBlocksService);

  name = '';
  active = true;
  blocks = signal<InspectionBlock[]>([]);

  constructor() {
    effect(() => {
      if (this.templateId) {
        this.loadTemplate(this.templateId);
        this.loadBlocks(this.templateId);
      } else {
        this.name = '';
        this.active = true;
        this.blocks.set([]);
      }
    });
  }

  loadTemplate(id: string) {
    this.templatesService.getOne(id).subscribe((t) => {
      this.name = t.name;
      this.active = t.active;
    });
  }

  loadBlocks(templateId: string) {
    this.blocksService.getBlocksByTemplateId(templateId).subscribe((res) => {
      this.blocks.set(res.data);
    });
  }

  saveTemplate() {
    const dto: CreateInspectionTemplateDto = {
      name: this.name,
      active: this.active,
    };

    if (this.templateId) {
      this.templatesService.update(this.templateId, dto).subscribe(() => this.saved.emit());
    } else {
      this.templatesService.create(dto).subscribe((newTemplate) => {
        // Emit created event with the new ID so parent can switch to edit mode
        this.created.emit(newTemplate._id);
      });
    }
  }

  addBlock() {
    if (!this.templateId) return;

    const newOrder = this.blocks().length + 1;
    const name = prompt('Enter block name:');
    if (!name) return;

    this.blocksService
      .create({
        name,
        order: newOrder,
        inspectionTemplateId: this.templateId,
        active: true,
      })
      .subscribe(() => {
        this.loadBlocks(this.templateId!);
      });
  }

  deleteBlock(id: string) {
    if (!confirm('Delete this block?')) return;
    this.blocksService.delete(id).subscribe(() => {
      if (this.templateId) this.loadBlocks(this.templateId);
    });
  }
}
