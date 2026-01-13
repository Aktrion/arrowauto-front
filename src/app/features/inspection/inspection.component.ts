import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  InspectionPointStatus,
  InspectionResult,
  TyreCondition,
  TyreMeasurement,
} from '../../core/models';
import { InspectionService } from './services/inspection.service';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-inspection',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './inspection.component.html',
})
export class InspectionComponent {
  icons = ICONS;
  private inspectionService = inject(InspectionService);
  private vehicleService = inject(VehicleService);

  inspectionPoints = this.inspectionService.inspectionPoints;

  selectedVehicleId = signal<string | null>(null);
  activeCategory = signal<string>('all');
  inspectionResults = signal<Map<string, Partial<InspectionResult>>>(new Map());

  vehiclesForInspection = computed(() =>
    this.vehicleService
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

  groupedPoints = computed(() => {
    const points = this.filteredPoints();
    const groups = new Map<string, typeof points>();

    // Define the order of categories as per requirement
    const order = [
      'Vehicle Receiving',
      'External/Drive in Inspection',
      'Internal/Lamps/Electrics',
      'Under Bonnet',
      'Wheels Tyres',
      'Brakes Hubs',
      'Underside',
      'Additional Items',
      'Video Overview',
    ];

    points.forEach((point) => {
      const current = groups.get(point.category) || [];
      current.push(point);
      groups.set(point.category, current);
    });

    // Return array of objects { category: string, points: Point[] } sorted by defined order
    return order
      .filter((cat) => groups.has(cat))
      .map((category) => ({
        category,
        points: groups.get(category)!,
      }));
  });

  // Helper to find specific tyre points for the visualizer
  getTyrePointId(position: 'NSF' | 'OSF' | 'NSR' | 'OSR' | 'Spare'): string | undefined {
    // Map visual positions to codes
    const codeMap: Record<string, string> = {
      NSF: 'NSFT', // Near Side Front (Passenger)
      OSF: 'OSFT', // Off Side Front (Driver)
      NSR: 'NSRT', // Near Side Rear
      OSR: 'OSRT', // Off Side Rear
      Spare: 'SS',
    };

    const code = codeMap[position];
    return this.inspectionPoints().find((p) => p.code === code)?.id;
  }

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

  // Tyre specific methods
  getTyreMeasurement(pointId: string, type: keyof TyreMeasurement): number {
    const result = this.inspectionResults().get(pointId);
    return result?.tyreMeasurements?.[type] || 0;
  }

  setTyreMeasurement(pointId: string, type: keyof TyreMeasurement, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.inspectionResults.update((results) => {
      const newResults = new Map(results);
      const existing = newResults.get(pointId) || {
        id: crypto.randomUUID(),
        pointId,
        vehicleId: this.selectedVehicleId()!,
        photos: [],
        requiresParts: false,
        status: 'not_inspected', // Default status if starting with measurements
      };

      const measurements = existing.tyreMeasurements || { inner: 0, middle: 0, outer: 0 };
      newResults.set(pointId, {
        ...existing,
        tyreMeasurements: { ...measurements, [type]: value },
      });
      return newResults;
    });
  }

  getTyreCondition(pointId: string): TyreCondition {
    return this.inspectionResults().get(pointId)?.tyreCondition || 'unknown';
  }

  setTyreCondition(pointId: string, condition: TyreCondition): void {
    this.inspectionResults.update((results) => {
      const newResults = new Map(results);
      const existing = newResults.get(pointId) || {
        id: crypto.randomUUID(),
        pointId,
        vehicleId: this.selectedVehicleId()!,
        photos: [],
        requiresParts: false,
        status: 'not_inspected',
      };

      newResults.set(pointId, { ...existing, tyreCondition: condition });
      return newResults;
    });
  }
}
