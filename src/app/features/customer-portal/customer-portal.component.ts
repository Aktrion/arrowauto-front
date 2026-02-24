import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { of, switchMap, forkJoin } from 'rxjs';
import { ICONS } from '../../shared/icons';
import { VehicleService } from '../vehicles/services/vehicle.service';
import {
  BackendInspectionValue,
  InspectionService,
} from '../inspection/services/inspection.service';
import { ToastService } from '../../core/services/toast.service';
import { OperationService } from '../../shared/services/service.service';

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
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  templateUrl: './customer-portal.component.html',
})
export class CustomerPortalComponent implements OnInit {
  icons = ICONS;
  private readonly route = inject(ActivatedRoute);
  private readonly vehicleService = inject(VehicleService);
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
  isSubmittingApproval = signal(false);
  private currentVehicleId = signal<string | null>(null);
  private currentProductId = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const explicitVehicleId = params.get('vehicleId');
      if (explicitVehicleId) {
        this.loadPortalData(explicitVehicleId);
        return;
      }

      const firstVehicleId = this.vehicleService.vehicles()?.[0]?.vehicleId;
      if (firstVehicleId) {
        this.loadPortalData(firstVehicleId);
        return;
      }

      // this.vehicleService.loadVehicles().add(() => {
      //   const fallbackVehicleId = this.vehicleService.vehicles()?.[0]?.vehicleId;
      //   if (fallbackVehicleId) {
      //     this.loadPortalData(fallbackVehicleId);
      //   }
      // });
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

    const allOps = this.operationService.getVehicleOperations(vehicleId);
    const opsToUpdate = allOps.filter((o) => (o as any).inspectionValueId);

    const requests = opsToUpdate.map((op) => {
      const isApproved = this.cartIds().has((op as any).inspectionValueId);
      return this.operationService.updateVehicleOperation(op.id, {
        status: isApproved ? 'pending' : 'cancelled',
      });
    });

    const productId = this.currentProductId();
    if (!productId) return;

    const updateProcess$ = requests.length
      ? forkJoin(requests).pipe(
          switchMap(() =>
            this.vehicleService.updateProductStatusByVehicleId(productId, 'in_progress'),
          ),
        )
      : this.vehicleService.updateProductStatusByVehicleId(productId, 'in_progress');

    updateProcess$.subscribe({
      next: () => {
        (document.getElementById('confirm_modal') as HTMLDialogElement)?.close();
        this.toastService.success('Repairs approved successfully.');
        this.isSubmittingApproval.set(false);
        this.operationService.refresh();
      },
      error: () => {
        this.toastService.error('Failed to submit approval.');
        this.isSubmittingApproval.set(false);
      },
    });
  }

  private loadPortalData(vehicleId: string) {
    this.currentVehicleId.set(vehicleId);
    const productId = this.vehicleService.getVehicleInstanceIdByVehicleId(vehicleId);
    if (!productId) {
      return;
    }

    const instance = this.vehicleService.getVehicleById(productId);
    if (instance?.vehicle) {
      this.vehicleData = {
        plate: instance.vehicle.licensePlate,
        make: instance.vehicle.make,
        model: instance.vehicle.model,
        year: instance.vehicle.year || new Date().getFullYear(),
      };
    }

    this.resolveAndLoadInspectionData(vehicleId, productId);
  }

  private resolveAndLoadInspectionData(vehicleId: string, preferredProductId?: string) {
    const candidates = this.vehicleService
      .vehicles()
      .filter((v) => v.vehicleId === vehicleId)
      .map((v) => v._id)
      .filter((id): id is string => !!id);

    of(candidates)
      .pipe(
        switchMap((candidateIds) => {
          const orderedIds = preferredProductId
            ? [preferredProductId, ...candidateIds.filter((id) => id !== preferredProductId)]
            : candidateIds;

          if (!orderedIds.length) {
            this.currentProductId.set(null);
            this.repairItems = [];
            this.inspectionCategories = [];
            return of([]);
          }

          return this.tryLoadFirstInspectionData(orderedIds);
        }),
      )
      .subscribe();
  }

  private tryLoadFirstInspectionData(productIds: string[]): Observable<BackendInspectionValue[]> {
    const [currentId, ...rest] = productIds;
    if (!currentId) {
      this.currentProductId.set(null);
      this.repairItems = [];
      this.inspectionCategories = [];
      return of([] as BackendInspectionValue[]);
    }

    return this.inspectionService.getInspectionValuesByProduct(currentId).pipe(
      switchMap((values) => {
        if (values.length > 0 || rest.length === 0) {
          this.currentProductId.set(currentId);
          this.applyInspectionData(values);
          return of(values as BackendInspectionValue[]);
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

  private applyInspectionData(values: BackendInspectionValue[]) {
    const points = this.inspectionService.inspectionPoints();
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
