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
  vehicleInstanceId: string;
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

  editInspectionFromHistory(vehicleInstanceId: string): void {
    this.router.navigate(['/inspection', vehicleInstanceId]);
  }

  loadInspectionHistory(): void {
    this.isLoadingHistory.set(true);
    this.historyError.set(null);

    forkJoin({
      products: this.vehicleService.getAllVehicleInstances(),
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
        this.vehicleService.vehicles().forEach((v) => {
          if (v.vehicle?._id) vehicleById.set(v.vehicle._id, v.vehicle);
          if (v.vehicleId && v.vehicle) vehicleById.set(v.vehicleId, v.vehicle);
        });

        const inspectionValueById = new Map<string, any>();
        inspectionValues.forEach((value: any) => {
          const id = value._id || value.id;
          if (id) inspectionValueById.set(id, value);
        });

        const history: InspectionHistoryItem[] = [];
        products.forEach((product: any) => {
          const instanceId = product._id || product.id;
          if (!instanceId) return;

          const productValueIds = (product.inspectionValueIds || []).filter(Boolean);
          if (!productValueIds.length) return;

          const values = productValueIds
            .map((vid: string) => inspectionValueById.get(vid))
            .filter(Boolean);
          if (!values.length) return;

          const vehicleId = product.vehicleId;
          const vehicle = vehicleId ? vehicleById.get(vehicleId) : product.vehicle;

          let totalCost = 0;
          let okCount = 0;
          let warningCount = 0;
          let defectCount = 0;
          let latestTimestamp = 0;

          values.forEach((value: any) => {
            const status = this.inspectionService.mapValueToStatus(value.value);
            if (status === 'ok') okCount++;
            else if (status === 'warning') warningCount++;
            else if (status === 'defect') defectCount++;

            const costs = this.inspectionService.readCostsFromComments(value.comments || []);
            totalCost += costs.partsCost + costs.laborCost;

            const stamp = new Date(value.updatedAt || value.createdAt || '').getTime();
            if (!isNaN(stamp) && stamp > latestTimestamp) latestTimestamp = stamp;
          });

          history.push({
            vehicleId: vehicleId || '',
            vehicleInstanceId: instanceId,
            plate: vehicle?.licensePlate || 'N/A',
            makeModel: `${vehicle?.make || ''} ${vehicle?.model || ''}`.trim() || 'Unknown',
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

  private mapValueToStatus(
    value?: 'red' | 'yellow' | 'ok',
  ): 'ok' | 'warning' | 'defect' | 'not_inspected' {
    return this.inspectionService.mapValueToStatus(value);
  }

  private readCostsFromComments(comments: string[]): { partsCost: number; laborCost: number } {
    return this.inspectionService.readCostsFromComments(comments);
  }

  private normalizeId(ref?: any): string {
    return this.inspectionService.normalizeId(ref);
  }
}
