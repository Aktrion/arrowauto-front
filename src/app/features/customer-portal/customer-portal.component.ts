import { Component, OnInit, inject, signal } from '@angular/core';
import { InspectionPoint, InspectionValue } from '@features/inspection/models/inspection.model';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { ICONS } from '@shared/icons';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { InspectionService } from '@features/inspection/services/inspection.service';
import { ToastService } from '@core/services/toast.service';
import { OperationInstancesApiService } from '@shared/services/api/operation-instances-api.service';
import { BrandLogoComponent } from '@shared/components/brand-logo/brand-logo.component';

interface RepairItem {
  id: string;
  name: string;
  category: string;
  severity: 'minor' | 'major';
  comment: string;
  partsCost: number;
  laborCost: number;
  photos: string[];
  approved: boolean;
}

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule, BrandLogoComponent],
  templateUrl: './customer-portal.component.html',
})
export class CustomerPortalComponent implements OnInit {
  icons = ICONS;
  private readonly route = inject(ActivatedRoute);
  private readonly instanceApi = inject(VehicleInstancesApiService);
  private readonly inspectionService = inject(InspectionService);
  private readonly toastService = inject(ToastService);
  private readonly operationInstancesApi = inject(OperationInstancesApiService);

  vehicleData = {
    plate: '-',
    make: '-',
    model: '-',
    year: new Date().getFullYear(),
  };

  repairItems: RepairItem[] = [
    // Loaded from backend inspection-values
  ];

  inspectionCategories: Array<{
    name: string;
    status: 'ok' | 'warning';
    okCount: number;
    totalCount: number;
    points: Array<{ name: string; status: 'ok' | 'warning' | 'defect' }>;
  }> = [];

  cartIds = signal<Set<string>>(new Set());
  inspectionPoints = signal<InspectionPoint[]>([]);
  isSubmittingApproval = signal(false);
  private currentVehicleId = signal<string | null>(null);
  private currentVehicleInstanceId = signal<string | null>(null);
  /** Map from inspectionValueId → operationInstanceId, built when inspection data loads. */
  private opByInspectionValueId = new Map<string, string>();

  ngOnInit(): void {
    this.inspectionService
      .fetchInspectionPoints()
      .subscribe((points) => this.inspectionPoints.set(points));
    this.route.queryParamMap.subscribe((params) => {
      const vehicleInstanceId = params.get('vehicleInstanceId');
      const vehicleId = params.get('vehicleId');

      if (vehicleInstanceId) {
        this.loadByVehicleInstanceId(vehicleInstanceId);
        return;
      }
      if (vehicleId) {
        this.instanceApi.findInstanceByVehicleId(vehicleId).subscribe({
          next: (instance) => {
            if (instance?._id) this.loadByVehicleInstanceId(instance._id);
          },
          error: () => {},
        });
        return;
      }

      // Fallback: load the first vehicle pending approval
      this.instanceApi
        .findByPagination({
          page: 1,
          limit: 1,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          filters: { status: { value: 'pending_approval', operator: 'equals' as const } },
        })
        .subscribe((res) => {
          const first = res.data?.[0];
          if (first?._id) this.loadByVehicleInstanceId(first._id);
        });
    });
  }

  cartItems() {
    return this.repairItems.filter((item) => this.cartIds().has(item.id));
  }

  totalParts() {
    return this.cartItems().reduce((sum, item) => sum + item.partsCost, 0);
  }

  totalLabor() {
    return this.cartItems().reduce((sum, item) => sum + item.laborCost, 0);
  }

  subtotal() {
    return this.totalParts() + this.totalLabor();
  }

  totalVat() {
    return this.subtotal() * 0.2;
  }

  grandTotal() {
    return this.subtotal() + this.totalVat();
  }

  isInCart(id: string): boolean {
    return this.cartIds().has(id);
  }

  toggleCart(id: string): void {
    this.cartIds.update((ids) => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }

  confirmSelection(): void {
    (document.getElementById('confirm_modal') as HTMLDialogElement)?.showModal();
  }

  submitApproval(): void {
    const vehicleInstanceId = this.currentVehicleInstanceId();
    if (!vehicleInstanceId) return;

    this.isSubmittingApproval.set(true);

    const requests = this.repairItems.map((item) => {
      const opId = this.opByInspectionValueId.get(item.id);
      if (!opId) return of(null);
      const isApproved = this.cartIds().has(item.id);
      return this.operationInstancesApi.update(opId, {
        status: isApproved ? 'pending' : 'rejected',
        approvalStatus: isApproved ? 'approved' : 'rejected',
      });
    });

    const updateProcess$ = requests.length
      ? forkJoin(requests).pipe(
          switchMap(() =>
            this.instanceApi.update(vehicleInstanceId, { status: 'pending_operations' } as any),
          ),
        )
      : this.instanceApi.update(vehicleInstanceId, { status: 'pending_operations' } as any);

    updateProcess$.subscribe({
      next: () => {
        (document.getElementById('confirm_modal') as HTMLDialogElement)?.close();
        this.toastService.success('Repairs approved successfully.');
        this.isSubmittingApproval.set(false);
      },
      error: () => {
        this.toastService.error('Failed to submit approval.');
        this.isSubmittingApproval.set(false);
      },
    });
  }

  private loadByVehicleInstanceId(vehicleInstanceId: string) {
    this.currentVehicleInstanceId.set(vehicleInstanceId);

    this.instanceApi.findOne(vehicleInstanceId).subscribe({
      next: (instance) => {
        if (!instance) return;
        const apiInstance = instance as { vehicle?: { _id?: string }; vehicleId?: string };
        this.currentVehicleId.set(String(apiInstance.vehicleId ?? apiInstance.vehicle?._id ?? '') || null);
        if (instance.vehicle) {
          this.vehicleData = {
            plate: instance.vehicle.licensePlate ?? '-',
            make: instance.vehicle.make ?? '-',
            model: instance.vehicle.model ?? '-',
            year: instance.vehicle.year ?? new Date().getFullYear(),
          };
        }
        this.loadInspectionData(vehicleInstanceId);
      },
      error: () => {
        this.repairItems = [];
        this.inspectionCategories = [];
      },
    });
  }

  private loadInspectionData(vehicleInstanceId: string) {
    this.currentVehicleInstanceId.set(vehicleInstanceId);
    forkJoin({
      values: this.inspectionService.getInspectionValuesByVehicleInstance(vehicleInstanceId),
      ops: this.operationInstancesApi.findAll({ vehicleInstanceId }),
    }).subscribe(({ values, ops }) => {
      // Build inspectionValueId → operationInstanceId map for approval
      this.opByInspectionValueId.clear();
      (ops as any[]).forEach((op: any) => {
        const ivId = this.inspectionService.normalizeId(op.inspectionValueId);
        const opId = op._id || op.id;
        if (ivId && opId) this.opByInspectionValueId.set(ivId, String(opId));
      });
      this.applyInspectionData(values);
    });
  }

  private applyInspectionData(values: InspectionValue[]) {
    const points = this.inspectionPoints();
    const pointMap = new Map(
      points.map((p) => {
        const key = this.inspectionService.normalizeId(p) || (p as { id?: string }).id;
        return [key || '', p];
      }),
    );

    this.repairItems = values
      .filter((value) => value.value === 'red' || value.value === 'yellow')
      .map((value) => {
        const pointId = this.inspectionService.normalizeId(
          value.inspectionPointId || value.inspectionPoint,
        );
        const point = pointMap.get(pointId);
        const populatedPoint = value.inspectionPoint as { name?: string } | undefined;
        return {
          id: this.inspectionService.normalizeId(value),
          name:
            point?.name ||
            populatedPoint?.name ||
            'Inspection Item',
          category: point?.category || 'General',
          severity: value.value === 'red' ? 'major' : 'minor',
          comment: (value.comments || []).find((comment) => !comment.startsWith('__')) || '',
          partsCost: 0,
          laborCost: 0,
          photos: value.mediaUrls || [],
          approved: false,
        };
      });

    const grouped = new Map<string, Array<{ name: string; status: 'ok' | 'warning' | 'defect' }>>();
    values.forEach((value) => {
      const pointId = this.inspectionService.normalizeId(
        value.inspectionPointId || value.inspectionPoint,
      );
      const point = pointMap.get(pointId);
      if (!point) return;
      const category = point.category || 'General';
      const status = this.inspectionService.mapValueToStatus(value.value) as
        | 'ok'
        | 'warning'
        | 'defect';
      const list = grouped.get(category) || [];
      list.push({ name: point.name, status });
      grouped.set(category, list);
    });

    this.inspectionCategories = Array.from(grouped.entries()).map(([name, categoryPoints]) => {
      const okCount = categoryPoints.filter((point) => point.status === 'ok').length;
      const hasDefect = categoryPoints.some((point) => point.status === 'defect');
      return {
        name,
        status: hasDefect ? 'warning' : 'ok',
        okCount,
        totalCount: categoryPoints.length,
        points: categoryPoints,
      };
    });
  }

}
