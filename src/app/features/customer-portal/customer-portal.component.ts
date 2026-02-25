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
  private currentProductId = signal<string | null>(null);

  ngOnInit(): void {
    this.inspectionService
      .fetchInspectionPoints()
      .subscribe((points) => this.inspectionPoints.set(points));
    this.route.queryParamMap.subscribe((params) => {
      const explicitVehicleId = params.get('vehicleId');
      if (explicitVehicleId) {
        this.loadPortalData(explicitVehicleId);
        return;
      }

      this.instanceApi
        .findByPagination({ page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' })
        .subscribe((res) => {
          const first = res.data?.[0];
          if (first?.vehicleId) {
            this.loadPortalData(first.vehicleId);
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
    const vehicleId = this.currentVehicleId();
    if (!vehicleId) return;

    this.isSubmittingApproval.set(true);

    const allOps = this.operationService.getVehicleOperationsByVehicleId(
      this.vehicleOperations(),
      vehicleId,
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

    const productId = this.currentProductId();
    if (!productId) return;

    const updateProcess$ = requests.length
      ? forkJoin(requests).pipe(
          switchMap(() => this.instanceApi.update(productId, { status: 'in_progress' } as any)),
        )
      : this.instanceApi.update(productId, { status: 'in_progress' } as any);

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

  private loadPortalData(vehicleId: string) {
    this.currentVehicleId.set(vehicleId);
    this.operationService
      .fetchData()
      .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
    this.instanceApi.findInstanceByVehicleId(vehicleId).subscribe({
      next: (instance) => {
        if (!instance?._id) return;
        if (instance?.vehicle) {
          this.vehicleData = {
            plate: instance.vehicle.licensePlate ?? '-',
            make: instance.vehicle.make ?? '-',
            model: instance.vehicle.model ?? '-',
            year: instance.vehicle.year ?? new Date().getFullYear(),
          };
        }
        this.resolveAndLoadInspectionData(vehicleId, instance._id);
      },
    });
  }

  private resolveAndLoadInspectionData(vehicleId: string, preferredProductId?: string) {
    this.instanceApi
      .findByPagination({
        page: 1,
        limit: 50,
        filters: { vehicleId: { value: vehicleId, operator: 'equals' as const } },
      })
      .subscribe((res) => {
        const candidates = (res.data ?? []).map((v) => v._id).filter((id): id is string => !!id);
        const orderedIds = preferredProductId
          ? [preferredProductId, ...candidates.filter((id) => id !== preferredProductId)]
          : candidates;

        if (!orderedIds.length) {
          this.currentProductId.set(null);
          this.repairItems = [];
          this.inspectionCategories = [];
          return;
        }
        this.tryLoadFirstInspectionData(orderedIds).subscribe();
      });
  }

  private tryLoadFirstInspectionData(productIds: string[]): Observable<InspectionValue[]> {
    const [currentId, ...rest] = productIds;
    if (!currentId) {
      this.currentProductId.set(null);
      this.repairItems = [];
      this.inspectionCategories = [];
      return of([] as InspectionValue[]);
    }

    return this.inspectionService.getInspectionValuesByProduct(currentId).pipe(
      switchMap((values) => {
        if (values.length > 0 || rest.length === 0) {
          this.currentProductId.set(currentId);
          this.applyInspectionData(values);
          return of(values as InspectionValue[]);
        }
        return this.tryLoadFirstInspectionData(rest);
      }),
    );
  }

  private loadInspectionData(productId: string) {
    this.currentProductId.set(productId);
    this.inspectionService.getInspectionValuesByProduct(productId).subscribe((values) => {
      this.applyInspectionData(values);
    });
  }

  private applyInspectionData(values: InspectionValue[]) {
    const points = this.inspectionPoints();
    const pointMap = new Map(points.map((point) => [point.id, point]));

    this.repairItems = values
      .filter((value) => value.value === 'red' || value.value === 'yellow')
      .map((value) => {
        const pointId = this.inspectionService.normalizeId(
          value.inspectionPointId || value.inspectionPoint,
        );
        const point = pointMap.get(pointId);
        const costs = this.inspectionService.readCostsFromComments(value.comments || []);
        return {
          id: this.inspectionService.normalizeId(value),
          name: point?.name || 'Inspection Item',
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
