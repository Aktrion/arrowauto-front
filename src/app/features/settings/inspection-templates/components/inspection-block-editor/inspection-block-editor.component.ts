import { Component, Input, Output, EventEmitter, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { InspectionPointEditorComponent } from '@features/settings/inspection-templates/components/inspection-point-editor/inspection-point-editor.component';
import { InspectionBlock } from '@features/settings/inspection-templates/models/inspection-block.model';
import { InspectionBlocksService } from '@features/settings/inspection-templates/services/inspection-blocks.service';
import { InspectionPoint } from '@features/settings/inspection-templates/models/inspection-point.model';
import { InspectionPointsService } from '@features/settings/inspection-templates/services/inspection-points.service';
import { ICONS } from '@shared/icons';

@Component({
  selector: 'app-inspection-block-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, InspectionPointEditorComponent],
  templateUrl: './inspection-block-editor.component.html',
})
export class InspectionBlockEditorComponent {
  @Input() block!: InspectionBlock;
  @Output() deleteBlock = new EventEmitter<string>();
  @Output() updated = new EventEmitter<void>(); // Block updated

  icons = ICONS;
  private blocksService = inject(InspectionBlocksService);
  private pointsService = inject(InspectionPointsService);

  points = signal<InspectionPoint[]>([]);
  showPointEditor = false;
  selectedPoint: InspectionPoint | null = null;

  constructor() {
    effect(() => {
      if (this.block) {
        this.loadPoints();
      }
    });
  }

  loadPoints() {
    const blockId = this.block._id;
    if (!blockId) return;
    this.pointsService.getPointsByBlockId(blockId).subscribe((res) => {
      this.points.set(res.data);
    });
  }

  updateBlock() {
    const blockId = this.block._id;
    if (!blockId) return;
    this.blocksService
      .update(blockId, {
        name: this.block.name,
        active: this.block.active,
      })
      .subscribe(() => {
        this.updated.emit();
      });
  }

  addPoint() {
    this.selectedPoint = null;
    this.showPointEditor = true;
  }

  editPoint(point: InspectionPoint) {
    this.selectedPoint = point;
    this.showPointEditor = true;
  }

  deletePoint(id: string) {
    if (!confirm('Delete point?')) return;
    this.pointsService.deleteById(id).subscribe(() => this.loadPoints());
  }

  onPointSaved() {
    this.showPointEditor = false;
    this.loadPoints();
  }
}
