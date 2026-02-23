import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
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
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-inspection',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './inspection.component.html',
  styleUrl: './inspection.component.css',
})
export class InspectionComponent implements OnInit {
  icons = ICONS;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inspectionService = inject(InspectionService);
  private readonly vehicleService = inject(VehicleService);
  private readonly notificationService = inject(NotificationService);

  inspectionPoints = this.inspectionService.inspectionPoints;
  activeInspectionPoints = signal(this.inspectionService.inspectionPoints());

  selectedVehicleId = signal<string | null>(null);
  selectedVehicleInstanceId = signal<string | null>(null);
  activeCategory = signal<string>('all');
  inspectionResults = signal<Map<string, Partial<InspectionResult>>>(new Map());
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  vehiclesForInspection = computed(() =>
    this.vehicleService.vehicles().filter((v) => v.status === 'inspection' || v.status === 'in_progress'),
  );
  selectedVehicle = computed(() => {
    const vehicleId = this.selectedVehicleId();
    if (!vehicleId) return undefined;
    return this.vehicleService.getVehicleById(vehicleId);
  });
  inspectedCount = computed(
    () => this.countByStatus('ok') + this.countByStatus('warning') + this.countByStatus('defect'),
  );

  categories = computed(() => {
    const cats = new Set(this.activeInspectionPoints().map((p) => p.category));
    return Array.from(cats);
  });

  filteredPoints = computed(() => {
    const category = this.activeCategory();
    if (category === 'all') return this.activeInspectionPoints();
    return this.activeInspectionPoints().filter((p) => p.category === category);
  });

  groupedPoints = computed(() => {
    const points = this.filteredPoints();
    const groups = new Map<string, typeof points>();

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

    const ordered = order
      .filter((cat) => groups.has(cat))
      .map((category) => ({
        category,
        points: groups.get(category)!,
      }));

    const remaining = Array.from(groups.entries())
      .filter(([category]) => !order.includes(category))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, groupPoints]) => ({ category, points: groupPoints }));

    return [...ordered, ...remaining];
  });

  totalCost = computed(() => {
    let total = 0;
    this.inspectionResults().forEach((result) => {
      total += (result.partsCost || 0) + (result.laborCost || 0);
    });
    return total;
  });

  ngOnInit(): void {
    const vehicleInstanceId =
      this.route.snapshot.paramMap.get('vehicleInstanceId') ||
      this.route.snapshot.paramMap.get('productId');
    if (vehicleInstanceId) {
      this.selectInspectionByProductId(vehicleInstanceId);
      return;
    }
    this.router.navigate(['/inspection']);
  }

  private selectInspectionByProductId(productId: string): void {
    this.vehicleService.getVehicleInstanceById(productId).subscribe((product) => {
      const vehicleId = product?.vehicleId;
      if (!vehicleId) {
        this.saveError.set('No se encontró el vehículo para esta inspección.');
        this.notificationService.error('No se encontró el vehículo para esta inspección.');
        return;
      }
      const inspectionValueIds = Array.isArray((product as any)?.inspectionValueIds)
        ? (product as any).inspectionValueIds
            .map((id: any) => this.normalizeId(id))
            .filter((id: string) => !!id)
        : [];
      this.selectVehicle(
        vehicleId,
        productId,
        inspectionValueIds,
        (product as any)?.inspectionTemplateId,
      );
    });
  }

  // Helper to find specific tyre points for the visualizer
  getTyrePointId(position: 'NSF' | 'OSF' | 'NSR' | 'OSR' | 'Spare'): string | undefined {
    const codeMap: Record<string, string> = {
      NSF: 'NSFT',
      OSF: 'OSFT',
      NSR: 'NSRT',
      OSR: 'OSRT',
      Spare: 'SS',
    };

    const code = codeMap[position];
    const aliases: Record<string, string[]> = {
      NSFT: ['NSFT', 'LEFT-FRONT', 'FRONT-LEFT'],
      OSFT: ['OSFT', 'RIGHT-FRONT', 'FRONT-RIGHT'],
      NSRT: ['NSRT', 'LEFT-REAR', 'REAR-LEFT'],
      OSRT: ['OSRT', 'RIGHT-REAR', 'REAR-RIGHT'],
      SS: ['SS', 'SPARE'],
    };
    const expectedCodes = aliases[code] || [code];
    return this.activeInspectionPoints().find((p) =>
      expectedCodes.includes((p.code || '').toUpperCase()),
    )?.id;
  }

  selectVehicle(
    vehicleId: string,
    explicitProductId?: string,
    explicitInspectionValueIds: string[] = [],
    explicitTemplateId?: string,
  ): void {
    this.selectedVehicleId.set(vehicleId);
    this.selectedVehicleInstanceId.set(explicitProductId || null);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.inspectionResults.set(new Map());
    this.activeCategory.set('all');

    const vehicle = this.vehicleService.getVehicleById(vehicleId);
    const productId = explicitProductId || this.vehicleService.getProductIdByVehicleId(vehicleId);
    const templateId = explicitTemplateId || vehicle?.inspectionTemplateId;

    const points$ = templateId
      ? this.inspectionService.getInspectionPointsFromTemplate(templateId)
      : of(this.inspectionPoints());
    const values$ = explicitInspectionValueIds.length
      ? this.inspectionService.getInspectionValuesByIds(explicitInspectionValueIds)
      : productId
        ? this.inspectionService.getInspectionValuesByProduct(productId)
        : of([]);

    if (productId) {
      this.selectedVehicleInstanceId.set(productId);
    }

    forkJoin({ points: points$, values: values$ }).subscribe(({ points, values }) => {
      const resolvedPoints = points.length ? points : this.inspectionPoints();
      this.activeInspectionPoints.set(resolvedPoints);
      this.applyInspectionValuesToResults(
        values as any[],
        vehicleId,
        explicitInspectionValueIds,
        resolvedPoints,
      );
    });
  }

  private loadInspectionValuesForProduct(productId: string, vehicleId: string): void {
    this.inspectionService.getInspectionValuesByProduct(productId).subscribe((values) => {
      this.applyInspectionValuesToResults(values as any[], vehicleId, [], this.activeInspectionPoints());
    });
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

  setPointCommentFromEvent(pointId: string, event: Event): void {
    this.setPointComment(pointId, (event.target as HTMLTextAreaElement).value);
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

  submitInspection(): void {
    const vehicleId = this.selectedVehicleId();
    if (!vehicleId) return;

    const productId =
      this.selectedVehicleInstanceId() || this.vehicleService.getProductIdByVehicleId(vehicleId);
    if (!productId) {
      this.saveError.set('No product linked to this vehicle.');
      this.notificationService.error('No product linked to this vehicle.');
      return;
    }

    const pointsById = new Map(this.activeInspectionPoints().map((point) => [point.id, point]));
    const requests = Array.from(this.inspectionResults().entries()).map(([pointId, result]) => {
      const point = pointsById.get(pointId);
      if (!point) return of(null);

      const payload = {
        vehicleInstanceId: productId,
        // Legacy compatibility field
        productId,
        inspectionPointId: pointId,
        type: point.type || 'standard',
        value: this.mapStatusToValue(result.status),
        comments: this.buildComments(result.comment, result.partsCost, result.laborCost),
        mediaUrls: result.photos || [],
        innerDepth: result.tyreMeasurements?.inner,
        midDepth: result.tyreMeasurements?.middle,
        outerDepth: result.tyreMeasurements?.outer,
      };

      if (result.id && this.isMongoObjectId(result.id)) {
        return this.inspectionService.updateInspectionValue(result.id, payload);
      }
      return this.inspectionService.createInspectionValue(payload);
    });

    if (requests.length === 0) return;

    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    forkJoin(requests)
      .pipe(
        switchMap(() => {
          const currentStatus = this.vehicleService.getVehicleById(vehicleId)?.status;
          if (currentStatus === 'inspection') {
            return this.vehicleService.updateProductStatusByVehicleId(vehicleId, 'awaiting_approval');
          }
          return of(null);
        }),
      )
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saveSuccess.set(true);
          this.notificationService.success('Inspection saved successfully.');
          this.refreshCurrentVehicleResults(vehicleId);
          this.vehicleService.loadVehicles();
        },
        error: () => {
          this.isSaving.set(false);
          this.saveError.set('Failed to save inspection values.');
          this.notificationService.error('Failed to save inspection values.');
        },
      });
  }

  private refreshCurrentVehicleResults(vehicleId: string): void {
    const productId =
      this.selectedVehicleInstanceId() || this.vehicleService.getProductIdByVehicleId(vehicleId);
    if (!productId) {
      return;
    }
    this.loadInspectionValuesForProduct(productId, vehicleId);
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
        status: 'not_inspected',
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

  private mapValueToStatus(value?: 'red' | 'yellow' | 'ok'): InspectionPointStatus {
    if (value === 'ok') return 'ok';
    if (value === 'yellow') return 'warning';
    if (value === 'red') return 'defect';
    return 'not_inspected';
  }

  private mapStatusToValue(status?: InspectionPointStatus): 'red' | 'yellow' | 'ok' | undefined {
    if (status === 'ok') return 'ok';
    if (status === 'warning') return 'yellow';
    if (status === 'defect') return 'red';
    return undefined;
  }

  private buildComments(comment?: string, partsCost?: number, laborCost?: number): string[] {
    const comments: string[] = [];
    if (comment?.trim()) {
      comments.push(comment.trim());
    }
    comments.push(`__partsCost:${Number(partsCost || 0)}`);
    comments.push(`__laborCost:${Number(laborCost || 0)}`);
    return comments;
  }

  private readCostsFromComments(comments: string[]): { partsCost: number; laborCost: number } {
    const partsTag = comments.find((item) => item.startsWith('__partsCost:'));
    const laborTag = comments.find((item) => item.startsWith('__laborCost:'));
    return {
      partsCost: Number(partsTag?.split(':')[1] || 0),
      laborCost: Number(laborTag?.split(':')[1] || 0),
    };
  }

  private isMongoObjectId(value: string): boolean {
    return /^[a-f\d]{24}$/i.test(value);
  }

  private applyInspectionValuesToResults(
    values: any[],
    vehicleId: string,
    explicitInspectionValueIds: string[],
    points: { id: string }[],
  ): void {
    const mapped = new Map<string, Partial<InspectionResult>>();
    const fallbackPointByValueId = new Map<string, string>();

    if (explicitInspectionValueIds.length && points.length) {
      explicitInspectionValueIds.forEach((valueId, index) => {
        const point = points[index];
        if (valueId && point?.id) {
          fallbackPointByValueId.set(valueId, point.id);
        }
      });
    }

    values.forEach((value) => {
      const valueId = this.normalizeId(value?._id || value?.id);
      const pointId = this.normalizeId(
        value?.inspectionPointId || value?.inspectionPoint?._id || value?.inspectionPoint?.id,
      ) || (valueId ? fallbackPointByValueId.get(valueId) || '' : '');

      if (!pointId) return;

      const parsedCosts = this.readCostsFromComments(value.comments || []);
      mapped.set(pointId, {
        id: valueId || value._id || value.id,
        pointId,
        vehicleId,
        status: this.mapValueToStatus(value.value),
        comment: (value.comments || []).find((item: string) => !item.startsWith('__')) || '',
        photos: value.mediaUrls || [],
        partsCost: parsedCosts.partsCost,
        laborCost: parsedCosts.laborCost,
        tyreMeasurements:
          value.type === 'tyre'
            ? {
                inner: value.innerDepth || 0,
                middle: value.midDepth || 0,
                outer: value.outerDepth || 0,
              }
            : undefined,
        requiresParts: (parsedCosts.partsCost || 0) > 0,
      });
    });

    this.inspectionResults.set(mapped);
  }

  private normalizeId(ref?: string | { _id?: any; id?: any; $oid?: string } | null): string {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    const nested = (ref as any)._id || (ref as any).id || (ref as any).$oid;
    if (typeof nested === 'string') return nested;
    if (nested && typeof nested === 'object') return this.normalizeId(nested as any);
    return '';
  }

  backToInspectionList(): void {
    this.router.navigate(['/inspection']);
  }
}


