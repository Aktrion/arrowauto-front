import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '../../shared/icons';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { InspectionService } from '../inspection/services/inspection.service';
import { NotificationService } from '../../core/services/notification.service';

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
  private readonly notificationService = inject(NotificationService);

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

      this.vehicleService.loadVehicles().add(() => {
        const fallbackVehicleId = this.vehicleService.vehicles()?.[0]?.vehicleId;
        if (fallbackVehicleId) {
          this.loadPortalData(fallbackVehicleId);
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
    this.vehicleService
      .updateProductStatusByVehicleId(vehicleId, 'in_progress')
      .subscribe({
        next: () => {
          (document.getElementById('confirm_modal') as HTMLDialogElement)?.close();
          this.notificationService.success('Repairs approved successfully.');
          this.isSubmittingApproval.set(false);
        },
        error: () => {
          this.notificationService.error('Failed to submit approval.');
          this.isSubmittingApproval.set(false);
        },
      });
  }

  private loadPortalData(vehicleId: string) {
    this.currentVehicleId.set(vehicleId);
    const vehicle = this.vehicleService.getVehicleById(vehicleId);
    if (vehicle?.vehicle) {
      this.vehicleData = {
        plate: vehicle.vehicle.licensePlate,
        make: vehicle.vehicle.make,
        model: vehicle.vehicle.model,
        year: vehicle.vehicle.year || new Date().getFullYear(),
      };
    }

    const productId = this.vehicleService.getProductIdByVehicleId(vehicleId);
    if (!productId) {
      this.vehicleService.loadVehicles().add(() => {
        const resolvedProductId = this.vehicleService.getProductIdByVehicleId(vehicleId);
        if (!resolvedProductId) {
          this.currentProductId.set(null);
          this.repairItems = [];
          this.inspectionCategories = [];
          return;
        }
        this.currentProductId.set(resolvedProductId);
        this.loadInspectionData(resolvedProductId);
      });
      return;
    }

    this.currentProductId.set(productId);
    this.loadInspectionData(productId);
  }

  private loadInspectionData(productId: string) {
    const points = this.inspectionService.inspectionPoints();
    const pointMap = new Map(points.map((point) => [point.id, point]));

    this.inspectionService.getInspectionValuesByProduct(productId).subscribe((values) => {
      this.repairItems = values
        .filter((value) => value.value === 'red' || value.value === 'yellow')
        .map((value) => {
          const pointId = value.inspectionPointId || value.inspectionPoint?._id || value.inspectionPoint?.id || '';
          const point = pointMap.get(pointId);
          const costs = this.readCosts(value.comments || []);
          return {
            id: value._id || value.id || crypto.randomUUID(),
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
        const pointId = value.inspectionPointId || value.inspectionPoint?._id || value.inspectionPoint?.id || '';
        const point = pointMap.get(pointId);
        if (!point) return;
        const category = point.category || 'General';
        const status: 'ok' | 'warning' | 'defect' =
          value.value === 'ok' ? 'ok' : value.value === 'yellow' ? 'warning' : 'defect';
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
    });
  }

  private readCosts(comments: string[]) {
    const parts = comments.find((comment) => comment.startsWith('__partsCost:'));
    const labor = comments.find((comment) => comment.startsWith('__laborCost:'));
    return {
      partsCost: Number(parts?.split(':')[1] || 0),
      laborCost: Number(labor?.split(':')[1] || 0),
    };
  }
}
