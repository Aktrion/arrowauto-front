import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  InspectionTemplateStructure,
  InspectionTemplatesService,
  UpsertInspectionTemplateStructureDto,
} from '../../services/inspection-templates.service';
import { TyreConfigurationsService } from '../../services/tyre-configurations.service';
import { ICONS } from '../../../../../shared/icons';

type RequirementMode = 'required' | 'requiredIfNok' | 'optional';
type PointType = 'standard' | 'tyre';

interface EditorPoint {
  id?: string;
  localId: string;
  name: string;
  type: PointType;
  tyreConfigurationId?: string;
  tyrePosition?: string;
  scriptedCommentsText: string;
  mandatory: boolean;
  mandatoryMedia: RequirementMode;
  mandatoryComment: RequirementMode;
  active: boolean;
}

interface EditorBlock {
  id?: string;
  localId: string;
  name: string;
  active: boolean;
  points: EditorPoint[];
}

interface EditorDraft {
  name: string;
  active: boolean;
  blocks: EditorBlock[];
}

const newPoint = (): EditorPoint => ({
  localId: crypto.randomUUID(),
  name: '',
  type: 'standard',
  scriptedCommentsText: '',
  mandatory: false,
  mandatoryMedia: 'optional',
  mandatoryComment: 'optional',
  active: true,
});

const newBlock = (): EditorBlock => ({
  localId: crypto.randomUUID(),
  name: '',
  active: true,
  points: [],
});

@Component({
  selector: 'app-inspection-template-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './inspection-template-editor.component.html',
})
export class InspectionTemplateEditorComponent implements OnChanges {
  @Input() templateId: string | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() created = new EventEmitter<string>();

  icons = ICONS;

  private templatesService = inject(InspectionTemplatesService);
  private tyreConfigsService = inject(TyreConfigurationsService);

  tyreConfigs = this.tyreConfigsService.configurations;
  tyreCodeOptions = [
    { value: 'LEFT-FRONT', label: 'Left Front' },
    { value: 'RIGHT-FRONT', label: 'Right Front' },
    { value: 'LEFT-REAR', label: 'Left Rear' },
    { value: 'RIGHT-REAR', label: 'Right Rear' },
    { value: 'SPARE', label: 'Spare' },
  ];

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  collapsedPointKeys = signal<Set<string>>(new Set());
  draft = signal<EditorDraft>({
    name: '',
    active: true,
    blocks: [newBlock()],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['templateId']) {
      this.load();
    }
  }

  load() {
    this.error.set(null);
    if (!this.templateId) {
      this.draft.set({
        name: '',
        active: true,
        blocks: [newBlock()],
      });
      return;
    }

    this.loading.set(true);
    this.templatesService.getStructure(this.templateId).subscribe({
      next: (structure) => {
        this.draft.set(this.mapFromStructure(structure));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load template');
        this.loading.set(false);
      },
    });
  }

  save() {
    const state = this.draft();
    this.error.set(null);

    if (!state.name.trim()) {
      this.error.set('Template name is required.');
      return;
    }

    const hasInvalidBlock = state.blocks.some((block) => !block.name.trim());
    if (hasInvalidBlock) {
      this.error.set('Each block must have a name.');
      return;
    }

    const hasInvalidPoint = state.blocks.some((block) =>
      block.points.some((point) => !point.name.trim()),
    );
    if (hasInvalidPoint) {
      this.error.set('Each inspection point must have a name.');
      return;
    }

    const hasInvalidTyreConfig = state.blocks.some((block) =>
      block.points.some(
        (point) =>
          point.type === 'tyre' &&
          (!point.tyreConfigurationId || !point.tyreConfigurationId.trim()),
      ),
    );
    if (hasInvalidTyreConfig) {
      this.error.set('Tyre points must have a tyre configuration.');
      return;
    }

    const hasInvalidTyreCode = state.blocks.some((block) =>
      block.points.some(
        (point) =>
          point.type === 'tyre' && (!point.tyrePosition || !point.tyrePosition.trim()),
      ),
    );
    if (hasInvalidTyreCode) {
      this.error.set('Tyre points must have a tyre code.');
      return;
    }

    this.saving.set(true);
    const payload = this.mapToUpsertPayload(state);
    this.templatesService.upsertStructure(payload).subscribe({
      next: (result) => {
        this.saving.set(false);
        if (!this.templateId) {
          this.created.emit(result._id);
        } else {
          this.saved.emit();
        }
      },
      error: () => {
        this.error.set('Failed to save template');
        this.saving.set(false);
      },
    });
  }

  addBlock() {
    this.draft.update((state) => ({
      ...state,
      blocks: [...state.blocks, newBlock()],
    }));
  }

  removeBlock(localId: string) {
    this.draft.update((state) => {
      const nextBlocks = state.blocks.filter((block) => block.localId !== localId);
      return {
        ...state,
        blocks: nextBlocks.length ? nextBlocks : [newBlock()],
      };
    });
  }

  addPoint(blockLocalId: string) {
    this.draft.update((state) => ({
      ...state,
      blocks: state.blocks.map((block) =>
        block.localId === blockLocalId
          ? { ...block, points: [...block.points, newPoint()] }
          : block,
      ),
    }));
  }

  removePoint(blockLocalId: string, pointLocalId: string) {
    this.collapsedPointKeys.update((current) => {
      const next = new Set(current);
      next.delete(this.getPointKey(blockLocalId, pointLocalId));
      return next;
    });
    this.draft.update((state) => ({
      ...state,
      blocks: state.blocks.map((block) =>
        block.localId === blockLocalId
          ? {
              ...block,
              points: block.points.filter((point) => point.localId !== pointLocalId),
            }
          : block,
      ),
    }));
  }

  updateTemplateName(name: string) {
    this.draft.update((state) => ({ ...state, name }));
  }

  updateTemplateActive(active: boolean) {
    this.draft.update((state) => ({ ...state, active }));
  }

  updateBlockName(blockLocalId: string, name: string) {
    this.patchBlock(blockLocalId, { name });
  }

  updateBlockActive(blockLocalId: string, active: boolean) {
    this.patchBlock(blockLocalId, { active });
  }

  updatePoint(blockLocalId: string, pointLocalId: string, patch: Partial<EditorPoint>) {
    this.draft.update((state) => ({
      ...state,
      blocks: state.blocks.map((block) =>
        block.localId === blockLocalId
          ? {
              ...block,
              points: block.points.map((point) =>
                point.localId === pointLocalId ? { ...point, ...patch } : point,
              ),
            }
          : block,
      ),
    }));
  }

  togglePointCollapsed(blockLocalId: string, pointLocalId: string) {
    this.collapsedPointKeys.update((current) => {
      const next = new Set(current);
      const key = this.getPointKey(blockLocalId, pointLocalId);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isPointCollapsed(blockLocalId: string, pointLocalId: string) {
    return this.collapsedPointKeys().has(this.getPointKey(blockLocalId, pointLocalId));
  }

  private getPointKey(blockLocalId: string, pointLocalId: string) {
    return `${blockLocalId}::${pointLocalId}`;
  }

  private patchBlock(blockLocalId: string, patch: Partial<EditorBlock>) {
    this.draft.update((state) => ({
      ...state,
      blocks: state.blocks.map((block) =>
        block.localId === blockLocalId ? { ...block, ...patch } : block,
      ),
    }));
  }

  private mapFromStructure(structure: InspectionTemplateStructure): EditorDraft {
    return {
      name: structure.name,
      active: structure.active,
      blocks:
        structure.blocks.length > 0
          ? structure.blocks
              .sort((a, b) => a.order - b.order)
              .map((block) => ({
                id: block._id,
                localId: crypto.randomUUID(),
                name: block.name,
                active: block.active,
                points: (block.points || [])
                  .sort((a, b) => a.order - b.order)
                  .map((point) => ({
                    id: point._id,
                    localId: crypto.randomUUID(),
                    name: point.name,
                    type: point.type,
                    tyreConfigurationId: point.tyreConfigurationId,
                    tyrePosition: this.normalizeTyreCode(point.tyrePosition),
                    scriptedCommentsText: (point.scriptedComments || []).join('\n'),
                    mandatory: point.mandatory,
                    mandatoryMedia: point.mandatoryMedia,
                    mandatoryComment: point.mandatoryComment,
                    active: point.active,
                  })),
              }))
          : [newBlock()],
    };
  }

  private mapToUpsertPayload(draft: EditorDraft): UpsertInspectionTemplateStructureDto {
    return {
      templateId: this.templateId || undefined,
      name: draft.name.trim(),
      active: draft.active,
      blocks: draft.blocks.map((block, blockIndex) => ({
        id: block.id,
        name: block.name.trim(),
        active: block.active,
        order: blockIndex + 1,
        points: block.points.map((point, pointIndex) => ({
          id: point.id,
          name: point.name.trim(),
          type: point.type,
          tyreConfigurationId: point.type === 'tyre' ? point.tyreConfigurationId : undefined,
          tyrePosition:
            point.type === 'tyre' ? this.normalizeTyreCode(point.tyrePosition) : undefined,
          scriptedComments: point.scriptedCommentsText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          mandatory: point.mandatory,
          mandatoryMedia: point.mandatoryMedia,
          mandatoryComment: point.mandatoryComment,
          active: point.active,
          order: pointIndex + 1,
        })),
      })),
    };
  }

  private normalizeTyreCode(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '-');

    if (normalized === 'FRONT-LEFT') return 'LEFT-FRONT';
    if (normalized === 'FRONT-RIGHT') return 'RIGHT-FRONT';
    if (normalized === 'REAR-LEFT') return 'LEFT-REAR';
    if (normalized === 'REAR-RIGHT') return 'RIGHT-REAR';

    return normalized;
  }
}
