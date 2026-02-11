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
  InspectionPointsService,
  InspectionPoint,
  CreateInspectionPointDto,
  UpdateInspectionPointDto,
} from '../../services/inspection-points.service';
import { TyreConfigurationsService } from '../../services/tyre-configurations.service';
import { ICONS } from '../../../../../shared/icons';

@Component({
  selector: 'app-inspection-point-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
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

    if (this.point) {
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
