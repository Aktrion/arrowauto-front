import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InspectionPointStatus, InspectionResult } from '../../core/models';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-inspection',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inspection.component.html',
})
export class InspectionComponent {
  private dataService = inject(DataService);

  inspectionPoints = this.dataService.inspectionPoints;

  selectedVehicleId = signal<string | null>(null);
  activeCategory = signal<string>('all');
  inspectionResults = signal<Map<string, Partial<InspectionResult>>>(new Map());

  vehiclesForInspection = computed(() =>
    this.dataService
      .vehicles()
      .filter((v) => v.status === 'inspection' || v.status === 'in_progress')
  );

  categories = computed(() => {
    const cats = new Set(this.inspectionPoints().map((p) => p.category));
    return Array.from(cats);
  });

  filteredPoints = computed(() => {
    const category = this.activeCategory();
    if (category === 'all') return this.inspectionPoints();
    return this.inspectionPoints().filter((p) => p.category === category);
  });

  totalCost = computed(() => {
    let total = 0;
    this.inspectionResults().forEach((result) => {
      total += (result.partsCost || 0) + (result.laborCost || 0);
    });
    return total;
  });

  selectVehicle(vehicleId: string): void {
    this.selectedVehicleId.set(vehicleId);
    this.inspectionResults.set(new Map());
  }

  setCategory(category: string): void {
    this.activeCategory.set(category);
  }

  getPointStatus(pointId: string): InspectionPointStatus {
    return this.inspectionResults().get(pointId)?.status || 'not_inspected';
  }

  setPointStatus(pointId: string, status: InspectionPointStatus): void {
    this.inspectionResults.update((results) => {
      const newResults = new Map(results);
      const existing = newResults.get(pointId) || {
        id: crypto.randomUUID(),
        pointId,
        vehicleId: this.selectedVehicleId()!,
        photos: [],
        requiresParts: false,
      };
      newResults.set(pointId, { ...existing, status });
      return newResults;
    });
  }

  getPointComment(pointId: string): string {
    return this.inspectionResults().get(pointId)?.comment || '';
  }

  setPointComment(pointId: string, comment: string): void {
    this.inspectionResults.update((results) => {
      const newResults = new Map(results);
      const existing = newResults.get(pointId) || {
        id: crypto.randomUUID(),
        pointId,
        vehicleId: this.selectedVehicleId()!,
        photos: [],
        requiresParts: false,
      };
      newResults.set(pointId, { ...existing, comment });
      return newResults;
    });
  }

  getPointNotes(pointId: string): string {
    const result = this.inspectionResults().get(pointId);
    return (result as any)?.notes || '';
  }

  setPointNotes(pointId: string, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.inspectionResults.update((results) => {
      const newResults = new Map(results);
      const existing = newResults.get(pointId) || {
        id: crypto.randomUUID(),
        pointId,
        vehicleId: this.selectedVehicleId()!,
        photos: [],
        requiresParts: false,
      };
      newResults.set(pointId, { ...existing, notes: value } as any);
      return newResults;
    });
  }

  getPointPartsCost(pointId: string): number {
    return this.inspectionResults().get(pointId)?.partsCost || 0;
  }

  setPointPartsCost(pointId: string, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.inspectionResults.update((results) => {
      const newResults = new Map(results);
      const existing = newResults.get(pointId) || {
        id: crypto.randomUUID(),
        pointId,
        vehicleId: this.selectedVehicleId()!,
        photos: [],
        requiresParts: false,
      };
      newResults.set(pointId, { ...existing, partsCost: value });
      return newResults;
    });
  }

  getPointLaborCost(pointId: string): number {
    return this.inspectionResults().get(pointId)?.laborCost || 0;
  }

  setPointLaborCost(pointId: string, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.inspectionResults.update((results) => {
      const newResults = new Map(results);
      const existing = newResults.get(pointId) || {
        id: crypto.randomUUID(),
        pointId,
        vehicleId: this.selectedVehicleId()!,
        photos: [],
        requiresParts: false,
      };
      newResults.set(pointId, { ...existing, laborCost: value });
      return newResults;
    });
  }

  countByStatus(status: InspectionPointStatus): number {
    let count = 0;
    this.inspectionResults().forEach((result) => {
      if (result.status === status) count++;
    });
    return count;
  }

  hasInspectionResults(): boolean {
    return this.inspectionResults().size > 0;
  }
}
