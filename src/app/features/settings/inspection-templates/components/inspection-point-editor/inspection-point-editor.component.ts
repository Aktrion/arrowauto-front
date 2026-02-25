import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  InspectionPoint,
  CreateInspectionPointDto,
  UpdateInspectionPointDto,
} from '@features/settings/inspection-templates/models/inspection-point.model';
import { InspectionPointsService } from '@features/settings/inspection-templates/services/inspection-points.service';
import { TyreConfigurationsService } from '@features/settings/inspection-templates/services/tyre-configurations.service';
import { ICONS } from '@shared/icons';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';

@Component({
  selector: 'app-inspection-point-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SelectComponent],
  templateUrl: './inspection-point-editor.component.html',
})
export class InspectionPointEditorComponent {
  @Input() point: InspectionPoint | null = null;
  @Input() blockId!: string;
  @Input() blockName: string = '';
  @Input() order: number = 0;

  @Output() cancel = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  icons = ICONS;
  private pointsService = inject(InspectionPointsService);
  private tyreService = inject(TyreConfigurationsService);

  tyreConfigs = this.tyreService.configurations;

  // Form State
  name = '';
  type: 'standard' | 'tyre' = 'standard';
  tyreConfigurationId: string | null = null;
  tyrePosition = '';
  active = true;
  mandatory = false;
  mandatoryMedia: 'required' | 'requiredIfNok' | 'optional' = 'optional';
  mandatoryComment: 'required' | 'requiredIfNok' | 'optional' = 'optional';
  scriptedCommentsText = '';

  typeOptions: SelectOption[] = [
    { label: 'Standard', value: 'standard' },
    { label: 'Tyre', value: 'tyre' },
  ];

  tyreConfigSelectOptions = computed<SelectOption[]>(() =>
    this.tyreConfigs().map((c: any) => ({
      label: c.code,
      value: c._id,
    })),
  );

  tyrePositionOptions: SelectOption[] = [
    { label: 'Front Left', value: 'Front Left' },
    { label: 'Front Right', value: 'Front Right' },
    { label: 'Rear Left', value: 'Rear Left' },
    { label: 'Rear Right', value: 'Rear Right' },
    { label: 'Spare', value: 'Spare' },
  ];

  mandatoryMediaOptions: SelectOption[] = [
    { label: 'Optional', value: 'optional' },
    { label: 'Required', value: 'required' },
    { label: 'Required if Not OK', value: 'requiredIfNok' },
  ];

  mandatoryCommentOptions: SelectOption[] = [
    { label: 'Optional', value: 'optional' },
    { label: 'Required', value: 'required' },
    { label: 'Required if Not OK', value: 'requiredIfNok' },
  ];

  constructor() {
    effect(() => {
      if (this.point) {
        this.name = this.point.name;
        this.type = this.point.type;
        this.tyreConfigurationId = this.point.tyreConfigurationId || null;
        this.tyrePosition = this.point.tyrePosition || '';
        this.active = this.point.active;
        this.mandatory = this.point.mandatory;
        this.mandatoryMedia = this.point.mandatoryMedia;
        this.mandatoryComment = this.point.mandatoryComment;
        this.scriptedCommentsText = this.point.scriptedComments?.join('\\n') || '';
      } else {
        this.resetForm();
      }
    });
  }

  resetForm() {
    this.name = '';
    this.type = 'standard';
    this.tyreConfigurationId = null;
    this.tyrePosition = '';
    this.active = true;
    this.mandatory = false;
    this.mandatoryMedia = 'optional';
    this.mandatoryComment = 'optional';
    this.scriptedCommentsText = '';
  }

  save() {
    const scriptedComments = this.scriptedCommentsText
      .split('\\n')
      .map((s) => s.trim())
      .filter((s) => s);

    const payload: any = {
      name: this.name,
      type: this.type,
      active: this.active,
      mandatory: this.mandatory,
      mandatoryMedia: this.mandatoryMedia,
      mandatoryComment: this.mandatoryComment,
      scriptedComments,
    };

    if (this.type === 'tyre') {
      payload.tyreConfigurationId = this.tyreConfigurationId;
      payload.tyrePosition = this.tyrePosition;
    }

    if (this.point?._id) {
      this.pointsService.update(this.point._id, payload).subscribe(() => this.saved.emit());
    } else {
      payload.inspectionBlockId = this.blockId;
      payload.order = this.order;
      this.pointsService
        .create(payload as CreateInspectionPointDto)
        .subscribe(() => this.saved.emit());
    }
  }
}
