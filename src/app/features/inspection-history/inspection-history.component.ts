import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { InspectionService } from '../inspection/services/inspection.service';

interface InspectionHistoryItem {
  vehicleId: string;
  productId: string;
  plate: string;
  makeModel: string;
  pointsCount: number;
  okCount: number;
  warningCount: number;
  defectCount: number;
  totalCost: number;
  updatedAt?: Date;
}

@Component({
  selector: 'app-inspection-history',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DatePipe],
  templateUrl: './inspection-history.component.html',
})
export class InspectionHistoryComponent {
  icons = ICONS;
  private readonly inspectionService = inject(InspectionService);
  private readonly vehicleService = inject(VehicleService);
  private readonly router = inject(Router);

  inspectionHistory = signal<InspectionHistoryItem[]>([]);
  isLoadingHistory = signal(false);
  historyError = signal<string | null>(null);
  historySearchQuery = '';
  historySearchField: 'all' | 'plate' | 'makeModel' = 'all';
  historyPage = signal(1);
  readonly historyPageSize = 10;

  filteredInspectionHistory = computed(() => {
    const history = this.inspectionHistory();
    const query = this.historySearchQuery.trim().toLowerCase();
    if (!query) return history;

    return history.filter((item) => {
      const plate = item.plate.toLowerCase();
      const makeModel = item.makeModel.toLowerCase();
      if (this.historySearchField === 'plate') return plate.includes(query);
      if (this.historySearchField === 'makeModel') return makeModel.includes(query);
      return plate.includes(query) || makeModel.includes(query);
    });
  });

  paginatedInspectionHistory = computed(() => {
    const start = (this.historyPage() - 1) * this.historyPageSize;
    return this.filteredInspectionHistory().slice(start, start + this.historyPageSize);
  });

  historyTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredInspectionHistory().length / this.historyPageSize)),
  );

  constructor() {
    this.loadInspectionHistory();
  }

  onHistorySearchChange(value: string): void {
    this.historySearchQuery = value;
    this.historyPage.set(1);
  }

  setHistorySearchField(field: 'all' | 'plate' | 'makeModel'): void {
    this.historySearchField = field;
    this.historyPage.set(1);
  }

  editInspectionFromHistory(productId: string): void {
    this.router.navigate(['/inspection', productId]);
  }

  loadInspectionHistory(): void {
    this.isLoadingHistory.set(true);
    this.historyError.set(null);

    forkJoin({
      products: this.vehicleService.getAllProducts(),
      inspectionValues: this.inspectionService.getAllInspectionValues(),
    }).subscribe({
      next: ({ products, inspectionValues }) => {
        if (!inspectionValues.length) {
          this.inspectionHistory.set([]);
          this.historyPage.set(1);
          this.isLoadingHistory.set(false);
          return;
        }

        const vehicleById = new Map<string, any>();
        this.vehicleService.vehicles().forEach((vehicle: any) => {
          const rawVehicle = vehicle?.vehicle || vehicle;
          const vehicleId = this.normalizeId(vehicle?._id || vehicle?.id);
          const fallbackId = this.normalizeId(vehicle?.vehicleId);
          const resolvedId = vehicleId || fallbackId;
          if (!resolvedId) return;
          vehicleById.set(resolvedId, rawVehicle);
        });
        products.forEach((product: any) => {
          const productVehicle = product?.vehicle;
          const productVehicleId = this.normalizeId(product?.vehicleId || productVehicle?._id || productVehicle?.id);
          if (!productVehicleId || !productVehicle) return;
          if (vehicleById.has(productVehicleId)) return;
          vehicleById.set(productVehicleId, productVehicle);
        });

        const inspectionValueById = new Map<string, any>();
        inspectionValues.forEach((value: any) => {
          const valueId = this.normalizeId(value?._id || value?.id);
          if (!valueId) return;
          inspectionValueById.set(valueId, value);
        });

        const history: InspectionHistoryItem[] = [];
        products.forEach((product: any) => {
          const productId = this.normalizeId(product?._id || product?.id);
          if (!productId) return;

          const productValueIds = Array.isArray(product?.inspectionValueIds)
            ? product.inspectionValueIds.map((id: any) => this.normalizeId(id)).filter(Boolean)
            : [];
          if (!productValueIds.length) return;

          const values = productValueIds
            .map((valueId: string) => inspectionValueById.get(valueId))
            .filter(Boolean);
          if (!values.length) return;

          const productVehicleId = this.normalizeId(product?.vehicleId || product?.vehicle);
          const vehicle = productVehicleId ? vehicleById.get(productVehicleId) : null;

          let totalCost = 0;
          let okCount = 0;
          let warningCount = 0;
          let defectCount = 0;
          let latestTimestamp = 0;

          values.forEach((value: any) => {
            const status = this.mapValueToStatus(value.value);
            if (status === 'ok') okCount += 1;
            if (status === 'warning') warningCount += 1;
            if (status === 'defect') defectCount += 1;

            const parsed = this.readCostsFromComments(value.comments || []);
            totalCost += parsed.partsCost + parsed.laborCost;

            const stamp = new Date(value.updatedAt || value.createdAt || '').getTime();
            if (!Number.isNaN(stamp) && stamp > latestTimestamp) {
              latestTimestamp = stamp;
            }
          });

          history.push({
            vehicleId: productVehicleId || '',
            productId,
            plate: vehicle?.licensePlate || 'N/A',
            makeModel: `${vehicle?.make || ''} ${vehicle?.model || vehicle?.vehicleModel || ''}`.trim() || 'Unknown',
            pointsCount: values.length,
            okCount,
            warningCount,
            defectCount,
            totalCost,
            updatedAt: latestTimestamp ? new Date(latestTimestamp) : undefined,
          });
        });

        history.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
        this.inspectionHistory.set(history);
        this.historyPage.set(1);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.historyError.set('Failed to load inspection history.');
        this.isLoadingHistory.set(false);
      },
    });
  }

  nextHistoryPage() {
    if (this.historyPage() >= this.historyTotalPages()) return;
    this.historyPage.update((p) => p + 1);
  }

  prevHistoryPage() {
    if (this.historyPage() <= 1) return;
    this.historyPage.update((p) => p - 1);
  }

  private mapValueToStatus(value?: 'red' | 'yellow' | 'ok'): 'ok' | 'warning' | 'defect' | 'not_inspected' {
    if (value === 'ok') return 'ok';
    if (value === 'yellow') return 'warning';
    if (value === 'red') return 'defect';
    return 'not_inspected';
  }

  private readCostsFromComments(comments: string[]): { partsCost: number; laborCost: number } {
    const partsTag = comments.find((item) => item.startsWith('__partsCost:'));
    const laborTag = comments.find((item) => item.startsWith('__laborCost:'));
    return {
      partsCost: Number(partsTag?.split(':')[1] || 0),
      laborCost: Number(laborTag?.split(':')[1] || 0),
    };
  }

  private normalizeId(
    ref?: string | { _id?: any; id?: any; $oid?: string; toString?: () => string } | null,
  ): string {
    if (!ref) return '';
    if (typeof ref === 'string') {
      return /^[a-f\d]{24}$/i.test(ref) ? ref : '';
    }
    const anyRef: any = ref as any;
    if (typeof anyRef?.toHexString === 'function') {
      const hex = anyRef.toHexString();
      if (typeof hex === 'string' && /^[a-f\d]{24}$/i.test(hex)) return hex;
    }
    const nested = ref._id || ref.id || ref.$oid;
    if (typeof nested === 'string') return /^[a-f\d]{24}$/i.test(nested) ? nested : '';
    if (nested && typeof nested === 'object') return this.normalizeId(nested as any);
    if (typeof ref.toString === 'function') {
      const asString = ref.toString();
      if (asString && asString !== '[object Object]' && /^[a-f\d]{24}$/i.test(asString)) {
        return asString;
      }
    }
    return '';
  }
}

