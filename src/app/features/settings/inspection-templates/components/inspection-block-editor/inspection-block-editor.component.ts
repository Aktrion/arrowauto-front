import { Component, Input, Output, EventEmitter, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { InspectionPointEditorComponent } from '../inspection-point-editor/inspection-point-editor.component';
import { InspectionBlock, InspectionBlocksService } from '../../services/inspection-blocks.service';
import { InspectionPointsService, InspectionPoint } from '../../services/inspection-points.service';
import { ICONS } from '../../../../../shared/icons';

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
    this.pointsService.getPointsByBlockId(this.block._id).subscribe((res) => {
      this.points.set(res.data);
    });
  }

  updateBlock() {
    this.blocksService
      .update(this.block._id, {
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
    this.pointsService.delete(id).subscribe(() => this.loadPoints());
  }

  onPointSaved() {
    this.showPointEditor = false;
    this.loadPoints();
  }
}
