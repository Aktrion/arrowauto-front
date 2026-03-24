import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { VehicleInstance } from '@features/vehicles/models/vehicle.model';
import {
  InspectionPoint,
  InspectionPointStatus,
  InspectionResult,
  TyreCondition,
  TyreMeasurement,
} from '@features/inspection/models/inspection.model';
import { InspectionService } from '@features/inspection/services/inspection.service';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { ToastService } from '@core/services/toast.service';
import { InspectionUploadApiService } from '@features/inspection/services/api/inspection-upload-api.service';

@Component({
  selector: 'app-inspection',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  templateUrl: './inspection.component.html',
  styleUrl: './inspection.component.css',
})
export class InspectionComponent implements OnInit {
  icons = ICONS;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inspectionService = inject(InspectionService);
  private readonly instanceApi = inject(VehicleInstancesApiService);
  private readonly toastService = inject(ToastService);
  private readonly uploadApi = inject(InspectionUploadApiService);

  /** Track which point is currently uploading a photo */
  uploadingPointId = signal<string | null>(null);
  /** The pointId for which the file picker was opened */
  private _pendingPhotoPointId: string | null = null;

  defaultInspectionPoints = signal<InspectionPoint[]>([]);
  activeInspectionPoints = signal<InspectionPoint[]>([]);

  selectedVehicleId = signal<string | null>(null);
  selectedVehicleInstanceId = signal<string | null>(null);
  activeCategory = signal<string>('all');
  inspectionResults = signal<Map<string, Partial<InspectionResult>>>(new Map());
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  vehiclesForInspection = signal<VehicleInstance[]>([]);
  selectedVehicleData = signal<VehicleInstance | undefined>(undefined);
  selectedVehicle = computed(() => this.selectedVehicleData());
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
      .map((category) => ({ category, points: groups.get(category)! }));

    const remaining = Array.from(groups.entries())
      .filter(([category]) => !order.includes(category))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, groupPoints]) => ({ category, points: groupPoints }));

    return [...ordered, ...remaining];
  });


  ngOnInit(): void {
    this.inspectionService.fetchInspectionPoints().subscribe((points) => {
      this.defaultInspectionPoints.set(points);
      this.activeInspectionPoints.set(points);
    });
    const vehicleInstanceId = this.route.snapshot.paramMap.get('vehicleInstanceId');
    if (vehicleInstanceId) {
      this.selectInspectionByVehicleInstanceId(vehicleInstanceId);
      return;
    }
    this.router.navigate(['/inspection']);
  }

  private selectInspectionByVehicleInstanceId(vehicleInstanceId: string): void {
    this.instanceApi.findOne(vehicleInstanceId).subscribe((instance) => {
      if (!instance) {
        this.toastService.error('No se encontró la instancia de inspección.');
        return;
      }
      const apiInstance = instance as VehicleInstance & {
        vehicle?: { _id?: string };
        inspectionTemplate?: { _id?: string };
      };
      const vehicleId = instance.vehicleId ?? apiInstance.vehicle?._id ?? '';
      const inspectionTemplateId =
        instance.inspectionTemplateId ?? apiInstance.inspectionTemplate?._id ?? '';
      const inspectionValueIds = (instance.inspectionValueIds ?? []).filter(Boolean);

      this.selectVehicle(vehicleId, vehicleInstanceId, inspectionValueIds, inspectionTemplateId || undefined);
    });
  }

  getTyrePointId(position: 'NSF' | 'OSF' | 'NSR' | 'OSR' | 'Spare'): string | undefined {
    const codeMap: Record<string, string> = { NSF: 'NSFT', OSF: 'OSFT', NSR: 'NSRT', OSR: 'OSRT', Spare: 'SS' };
    const aliases: Record<string, string[]> = {
      NSFT: ['NSFT', 'LEFT-FRONT', 'FRONT-LEFT'],
      OSFT: ['OSFT', 'RIGHT-FRONT', 'FRONT-RIGHT'],
      NSRT: ['NSRT', 'LEFT-REAR', 'REAR-LEFT'],
      OSRT: ['OSRT', 'RIGHT-REAR', 'REAR-RIGHT'],
      SS: ['SS', 'SPARE'],
    };
    const code = codeMap[position];
    return this.activeInspectionPoints().find((p) =>
      (aliases[code] || [code]).includes((p.code || '').toUpperCase()),
    )?.id;
  }

  selectVehicle(
    vehicleId: string,
    explicitVehicleInstanceId?: string,
    explicitInspectionValueIds: string[] = [],
    explicitTemplateId?: string,
  ): void {
    this.selectedVehicleId.set(vehicleId);
    this.selectedVehicleInstanceId.set(explicitVehicleInstanceId || null);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.inspectionResults.set(new Map());
    this.activeCategory.set('all');

    const resolveInstanceAndLoad = (
      instance: VehicleInstance | null,
      vehicleInstanceId: string | undefined,
    ) => {
      if (instance) {
        this.selectedVehicleData.set(instance);
        if (instance._id) this.selectedVehicleInstanceId.set(instance._id);
      }
      const templateId = explicitTemplateId || instance?.inspectionTemplateId;
      const points$ = templateId
        ? this.inspectionService.getInspectionPointsFromTemplate(templateId)
        : of(this.defaultInspectionPoints());
      const values$ = explicitInspectionValueIds.length
        ? this.inspectionService.getInspectionValuesByIds(explicitInspectionValueIds)
        : vehicleInstanceId
          ? this.inspectionService.getInspectionValuesByVehicleInstance(vehicleInstanceId)
          : of([]);

      forkJoin({ points: points$, values: values$ }).subscribe(({ points, values }) => {
        const resolvedPoints = points.length ? points : this.defaultInspectionPoints();
        this.activeInspectionPoints.set(resolvedPoints);
        this.applyInspectionValuesToResults(
          values as any[],
          vehicleId,
          explicitInspectionValueIds,
          resolvedPoints,
        );
      });
    };

    if (explicitVehicleInstanceId) {
      this.instanceApi.findOne(explicitVehicleInstanceId).subscribe({
        next: (instance) => resolveInstanceAndLoad(instance, explicitVehicleInstanceId),
        error: () => resolveInstanceAndLoad(null, explicitVehicleInstanceId),
      });
    } else {
      this.instanceApi.findInstanceByVehicleId(vehicleId).subscribe({
        next: (instance) => resolveInstanceAndLoad(instance ?? null, instance?._id),
        error: () => resolveInstanceAndLoad(null, undefined),
      });
    }
  }

  setCategory(category: string): void {
    this.activeCategory.set(category);
  }

  getPointStatus(pointId: string): InspectionPointStatus {
    return this.inspectionResults().get(pointId)?.status || 'not_inspected';
  }

  setPointStatus(pointId: string, status: InspectionPointStatus): void {
    this.updateResult(pointId, { status });
  }

  getPointComment(pointId: string): string {
    return this.inspectionResults().get(pointId)?.comment || '';
  }

  setPointComment(pointId: string, comment: string): void {
    this.updateResult(pointId, { comment });
  }

  setPointCommentFromEvent(pointId: string, event: Event): void {
    this.updateResult(pointId, { comment: (event.target as HTMLTextAreaElement).value });
  }


  getTyreMeasurement(pointId: string, type: keyof TyreMeasurement): number {
    return this.inspectionResults().get(pointId)?.tyreMeasurements?.[type] || 0;
  }

  setTyreMeasurement(pointId: string, type: keyof TyreMeasurement, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    const existing = this.inspectionResults().get(pointId);
    const measurements = existing?.tyreMeasurements || { inner: 0, middle: 0, outer: 0 };
    this.updateResult(pointId, { tyreMeasurements: { ...measurements, [type]: value } });
  }

  getTyreCondition(pointId: string): TyreCondition {
    return this.inspectionResults().get(pointId)?.tyreCondition || 'unknown';
  }

  setTyreCondition(pointId: string, condition: TyreCondition): void {
    this.updateResult(pointId, { tyreCondition: condition });
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

    const validationError = this.validateMandatoryPoints();
    if (validationError) {
      this.toastService.error(validationError);
      return;
    }

    const vehicleInstanceId = this.selectedVehicleInstanceId();
    if (!vehicleInstanceId) {
      this.instanceApi.findInstanceByVehicleId(vehicleId).subscribe({
        next: (instance) => {
          if (instance?._id) {
            this.selectedVehicleInstanceId.set(instance._id);
            this.doSubmitInspection(vehicleId, instance._id);
          } else {
            this.toastService.error('No vehicle instance linked to this vehicle.');
          }
        },
        error: () => this.toastService.error('No vehicle instance linked to this vehicle.'),
      });
      return;
    }
    this.doSubmitInspection(vehicleId, vehicleInstanceId);
  }

  private validateMandatoryPoints(): string | null {
    const results = this.inspectionResults();
    for (const point of this.activeInspectionPoints()) {
      const result = results.get(point.id);
      const status = result?.status ?? 'not_inspected';
      const isNok = status === 'warning' || status === 'defect';

      if (point.mandatory && status === 'not_inspected') {
        return `"${point.name}" is mandatory and must be inspected.`;
      }

      const commentRule = point.mandatoryComment ?? 'optional';
      const needsComment = commentRule === 'required' || (commentRule === 'requiredIfNok' && isNok);
      if (needsComment && !result?.comment?.trim()) {
        return `"${point.name}" requires a comment.`;
      }

      const mediaRule = point.mandatoryMedia ?? 'optional';
      const needsMedia = mediaRule === 'required' || (mediaRule === 'requiredIfNok' && isNok);
      if (needsMedia && !(result?.photos?.length)) {
        return `"${point.name}" requires at least one photo.`;
      }
    }
    return null;
  }

  private doSubmitInspection(vehicleId: string, vehicleInstanceId: string): void {
    const pointsById = new Map(this.activeInspectionPoints().map((point) => [point.id, point]));
    const requests = Array.from(this.inspectionResults().entries()).map(([pointId, result]) => {
      const point = pointsById.get(pointId);
      if (!point) return of(null);

      const payload = {
        vehicleInstanceId,
        inspectionPointId: pointId,
        type: point.type || 'standard',
        value: this.inspectionService.mapStatusToValue(result.status),
        comments: this.inspectionService.buildComments(result.comment),
        mediaUrls: result.photos || [],
        innerDepth: result.tyreMeasurements?.inner,
        midDepth: result.tyreMeasurements?.middle,
        outerDepth: result.tyreMeasurements?.outer,
      };

      if (result.id && this.inspectionService.normalizeId(result.id).length === 24) {
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
        switchMap(() =>
          this.instanceApi.findOne(vehicleInstanceId).pipe(
            switchMap((instance) => {
              if (instance?.status === 'pending_inspection') {
                return this.instanceApi.completeInspection(vehicleInstanceId);
              }
              return of(null);
            }),
          ),
        ),
      )
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saveSuccess.set(true);
          this.toastService.success('Inspection saved successfully.');
          // Navigate to inspection history after saving
          this.router.navigate(['/inspection-history']);
        },
        error: () => {
          this.isSaving.set(false);
          this.saveError.set('Failed to save inspection values.');
          this.toastService.error('Failed to save inspection values.');
        },
      });
  }

  /** Creates or patches a result entry for the given pointId. */
  private updateResult(pointId: string, updates: Partial<InspectionResult>): void {
    this.inspectionResults.update((results) => {
      const newResults = new Map(results);
      const existing = newResults.get(pointId) || {
        id: crypto.randomUUID(),
        pointId,
        vehicleId: this.selectedVehicleId()!,
        photos: [],
      };
      newResults.set(pointId, { ...existing, ...updates });
      return newResults;
    });
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
        if (valueId && point?.id) fallbackPointByValueId.set(valueId, point.id);
      });
    }

    values.forEach((value) => {
      const valueId = this.inspectionService.normalizeId(value?._id || value?.id);
      const pointId =
        this.inspectionService.normalizeId(
          value?.inspectionPointId || value?.inspectionPoint?._id || value?.inspectionPoint?.id,
        ) || (valueId ? fallbackPointByValueId.get(valueId) || '' : '');

      if (!pointId) return;

      mapped.set(pointId, {
        id: valueId,
        pointId,
        vehicleId,
        status: this.inspectionService.mapValueToStatus(value.value),
        comment: (value.comments || []).find((item: string) => !item.startsWith('__')) || '',
        photos: value.mediaUrls || [],
        tyreMeasurements:
          value.type === 'tyre'
            ? { inner: value.innerDepth || 0, middle: value.midDepth || 0, outer: value.outerDepth || 0 }
            : undefined,
      });
    });

    this.inspectionResults.set(mapped);
  }

  /** Open file picker for a given point. useCamera=true opens the rear camera on mobile. */
  openPhotoPicker(pointId: string, fileInput: HTMLInputElement): void {
    this._pendingPhotoPointId = pointId;
    fileInput.value = '';
    fileInput.click();
  }

  onPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const pointId = this._pendingPhotoPointId;
    if (!file || !pointId) return;

    this.uploadingPointId.set(pointId);
    this.uploadApi.uploadPhoto(file).subscribe({
      next: ({ url }) => {
        const existing = this.inspectionResults().get(pointId);
        const photos = [...(existing?.photos ?? []), url];
        this.updateResult(pointId, { photos });
        this.uploadingPointId.set(null);
        this.toastService.success('Photo uploaded');
      },
      error: () => {
        this.uploadingPointId.set(null);
        this.toastService.error('Failed to upload photo');
      },
    });
  }

  removePhoto(pointId: string, url: string): void {
    const existing = this.inspectionResults().get(pointId);
    const photos = (existing?.photos ?? []).filter((p) => p !== url);
    this.updateResult(pointId, { photos });
    // best-effort delete from S3
    this.uploadApi.deletePhoto(url).subscribe();
  }

  backToInspectionList(): void {
    this.router.navigate(['/inspection']);
  }
}
