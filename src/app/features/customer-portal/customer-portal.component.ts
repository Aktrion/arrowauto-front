import { Component, OnInit, inject, signal } from '@angular/core';
import { InspectionPoint } from '@features/inspection/models/inspection.model';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { of, switchMap, forkJoin } from 'rxjs';
import { ICONS } from '@shared/icons';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { InspectionValue } from '@features/inspection/models/inspection.model';
import { InspectionService } from '@features/inspection/services/inspection.service';
import { ToastService } from '@core/services/toast.service';
import { OperationService } from '@shared/services/operation.service';
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
  private readonly operationService = inject(OperationService);

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
  vehicleOperations = signal<any[]>([]);
  isSubmittingApproval = signal(false);
  private currentVehicleId = signal<string | null>(null);
  private currentVehicleInstanceId = signal<string | null>(null);

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
        this.loadPortalDataOrByInstanceId(vehicleId);
        return;
      }

      this.instanceApi
        .findByPagination({
          page: 1,
          limit: 10,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          filters: { status: { value: 'pending_approval', operator: 'equals' as const } },
        })
        .subscribe((res) => {
          const first = res.data?.[0];
          const resolvedVehicleId =
            first?.vehicleId ??
            (first as { vehicle?: { _id?: string } })?.vehicle?._id;
          if (resolvedVehicleId && first?._id) {
            this.loadPortalData(resolvedVehicleId, first._id);
          }
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
    const vehicleId = this.currentVehicleId();
    const filterId = vehicleInstanceId || vehicleId;
    if (!filterId) return;

    this.isSubmittingApproval.set(true);

    const allOps = this.operationService.getVehicleOperationsByVehicleId(
      this.vehicleOperations(),
      filterId,
    );
    const opsToUpdate = allOps.filter((o) => (o as any).inspectionValueId);

    const requests = opsToUpdate.map((op) => {
      const isApproved = this.cartIds().has((op as any).inspectionValueId);
      return this.operationService.updateVehicleOperation(
        op.id,
        { status: isApproved ? 'pending' : 'cancelled' },
        this.vehicleOperations(),
      );
    });

    if (!vehicleInstanceId) return;

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
        this.operationService
          .fetchData()
          .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
      },
      error: () => {
        this.toastService.error('Failed to submit approval.');
        this.isSubmittingApproval.set(false);
      },
    });
  }

  private loadByVehicleInstanceId(vehicleInstanceId: string) {
    this.currentVehicleInstanceId.set(vehicleInstanceId);
    this.operationService
      .fetchData()
      .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));

    this.instanceApi.findOne(vehicleInstanceId).subscribe({
      next: (instance) => {
        if (!instance) return;
        const apiInstance = instance as { vehicle?: { _id?: string }; vehicleId?: string };
        const resolvedVehicleId = String(
          apiInstance.vehicleId ?? apiInstance.vehicle?._id ?? '',
        );
        this.currentVehicleId.set(resolvedVehicleId || null);
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

  private loadPortalDataOrByInstanceId(idFromUrl: string) {
    this.instanceApi.findInstanceByVehicleId(idFromUrl).subscribe({
      next: (instance) => {
        if (instance?._id) {
          const vehicleId =
            instance.vehicleId ??
            (instance as { vehicle?: { _id?: string } })?.vehicle?._id;
          if (vehicleId) {
            this.loadPortalData(vehicleId, instance._id);
            return;
          }
        }
        this.instanceApi.findOne(idFromUrl).subscribe({
          next: (instanceById) => {
            if (instanceById?._id) {
              this.loadByVehicleInstanceId(idFromUrl);
            }
          },
        });
      },
      error: () => {
        this.instanceApi.findOne(idFromUrl).subscribe({
          next: (instanceById) => {
            if (instanceById?._id) {
              this.loadByVehicleInstanceId(idFromUrl);
            }
          },
        });
      },
    });
  }

  private loadPortalData(vehicleId: string, preferredInstanceId?: string) {
    const resolvedVehicleId =
      vehicleId ?? this.currentVehicleId() ?? '';
    this.currentVehicleId.set(resolvedVehicleId);
    this.operationService
      .fetchData()
      .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
    this.instanceApi.findInstanceByVehicleId(resolvedVehicleId).subscribe({
      next: (instance) => {
        if (!instance?._id) return;
        const apiInstance = instance as { vehicle?: { _id?: string } };
        const instanceVehicleId =
          instance.vehicleId ?? apiInstance.vehicle?._id;
        if (instanceVehicleId && !resolvedVehicleId) {
          this.currentVehicleId.set(instanceVehicleId);
        }
        if (instance.vehicle) {
          this.vehicleData = {
            plate: instance.vehicle.licensePlate ?? '-',
            make: instance.vehicle.make ?? '-',
            model: instance.vehicle.model ?? '-',
            year: instance.vehicle.year ?? new Date().getFullYear(),
          };
        }
        this.resolveAndLoadInspectionData(
          instanceVehicleId ?? resolvedVehicleId,
          preferredInstanceId ?? instance._id,
        );
      },
    });
  }

  private resolveAndLoadInspectionData(
    vehicleId: string,
    preferredVehicleInstanceId?: string,
  ) {
    if (!vehicleId && !preferredVehicleInstanceId) return;
    const pagination =
      vehicleId
        ? {
            page: 1,
            limit: 50,
            filters: { vehicleId: { value: vehicleId, operator: 'equals' as const } },
          }
        : { page: 1, limit: 50, filters: {} as Record<string, unknown> };
    this.instanceApi.findByPagination(pagination)
      .subscribe((res) => {
        const candidates = (res.data ?? []).map((v) => v._id).filter((id): id is string => !!id);
        const orderedIds = preferredVehicleInstanceId
          ? [preferredVehicleInstanceId, ...candidates.filter((id) => id !== preferredVehicleInstanceId)]
          : candidates;

        if (!orderedIds.length) {
          this.currentVehicleInstanceId.set(null);
          this.repairItems = [];
          this.inspectionCategories = [];
          return;
        }
        this.tryLoadFirstInspectionData(orderedIds).subscribe();
      });
  }

  private tryLoadFirstInspectionData(vehicleInstanceIds: string[]): Observable<InspectionValue[]> {
    const [currentId, ...rest] = vehicleInstanceIds;
    if (!currentId) {
      this.currentVehicleInstanceId.set(null);
      this.repairItems = [];
      this.inspectionCategories = [];
      return of([] as InspectionValue[]);
    }

    return this.inspectionService.getInspectionValuesByVehicleInstance(currentId).pipe(
      switchMap((values) => {
        if (values.length > 0 || rest.length === 0) {
          this.currentVehicleInstanceId.set(currentId);
          this.applyInspectionData(values);
          return of(values as InspectionValue[]);
        }
        return this.tryLoadFirstInspectionData(rest);
      }),
    );
  }

  private loadInspectionData(vehicleInstanceId: string) {
    this.currentVehicleInstanceId.set(vehicleInstanceId);
    this.inspectionService.getInspectionValuesByVehicleInstance(vehicleInstanceId).subscribe((values) => {
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
        const costs = this.inspectionService.readCostsFromComments(value.comments || []);
        return {
          id: this.inspectionService.normalizeId(value),
          name:
            point?.name ||
            populatedPoint?.name ||
            'Inspection Item',
          category: point?.category || 'General',
          severity: value.value === 'red' ? 'major' : 'minor',
          comment: (value.comments || []).find((comment) => !comment.startsWith('__')) || '',
          partsCost: costs.partsCost,
          laborCost: costs.laborCost,
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

  private readCosts(comments: string[]) {
    return this.inspectionService.readCostsFromComments(comments);
  }
}
