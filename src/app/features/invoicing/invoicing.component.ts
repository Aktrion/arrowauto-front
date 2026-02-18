import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { OperationService } from '../../shared/services/service.service';
import { UserService } from '../../core/services/user.service';
import { VehicleOperation } from '../../core/models';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-invoicing',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './invoicing.component.html',
})
export class InvoicingComponent {
  icons = ICONS;
  private vehicleService = inject(VehicleService);
  private operationService = inject(OperationService);
  private userService = inject(UserService);

  searchQuery = '';
  searchField: 'all' | 'job' | 'plate' | 'operation' | 'status' = 'all';
  activeTab = signal<'pending' | 'completed' | 'invoiced'>('pending');
  selectedIds = signal<Set<string>>(new Set());
  selectedItem = signal<{ op: VehicleOperation; product: any } | null>(null);
  currentPage = signal(1);
  readonly pageSize = 10;

  completeForm = {
    operatorId: '',
    duration: 0,
    hourlyRate: 45,
    notes: '',
  };

  operators = this.userService.operatorsByRole;

  allOperations = computed(() => {
    const vehicles = this.vehicleService.vehicles();
    const vehicleOps = this.operationService.vehicleOperations();

    return vehicleOps.map((op) => ({
      op,
      product: vehicles.find((v) => v.id === op.vehicleId),
    }));
  });

  filteredOperations = computed(() => {
    const tab = this.activeTab();
    let ops = this.allOperations();

    if (tab === 'pending') {
      ops = ops.filter(
        (item) =>
          item.op.status === 'pending' ||
          item.op.status === 'scheduled' ||
          item.op.status === 'in_progress'
      );
    } else if (tab === 'completed') {
      ops = ops.filter((item) => item.op.status === 'completed');
    } else if (tab === 'invoiced') {
      ops = ops.filter((item) => item.op.status === 'invoiced' || (item.op as any).invoiced === true);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      ops = ops.filter(
        (item) => {
          const job = item.product?.vehicle?.jobNumber?.toLowerCase() || '';
          const plate = item.product?.vehicle?.licensePlate?.toLowerCase() || '';
          const operation = item.op.operation?.name?.toLowerCase() || '';
          const status = item.op.status.toLowerCase();

          if (this.searchField === 'job') return job.includes(query);
          if (this.searchField === 'plate') return plate.includes(query);
          if (this.searchField === 'operation') return operation.includes(query);
          if (this.searchField === 'status') return status.includes(query);
          return (
            job.includes(query) ||
            plate.includes(query) ||
            operation.includes(query) ||
            status.includes(query)
          );
        },
      );
    }

    return ops;
  });

  paginatedOperations = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredOperations().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredOperations().length / this.pageSize)),
  );

  pendingCount = computed(
    () =>
      this.allOperations().filter(
        (i) =>
          i.op.status === 'pending' || i.op.status === 'scheduled' || i.op.status === 'in_progress'
      ).length
  );

  readyToInvoiceCount = computed(
    () => this.allOperations().filter((i) => i.op.status === 'completed').length
  );

  invoicedTodayCount = computed(
    () =>
      this.allOperations().filter((item) => {
        if (item.op.status !== 'invoiced') return false;
        if (!item.op.completedAt) return false;
        return new Date(item.op.completedAt).toDateString() === new Date().toDateString();
      }).length,
  );

  totalRevenueToday = computed(() =>
    this.allOperations()
      .filter((item) => {
        if (item.op.status !== 'invoiced') return false;
        if (!item.op.completedAt) return false;
        return new Date(item.op.completedAt).toDateString() === new Date().toDateString();
      })
      .reduce((sum, item) => sum + this.calculateTotal(item.op), 0),
  );

  allSelected = computed(() => {
    const filtered = this.filteredOperations();
    return filtered.length > 0 && filtered.every((item) => this.selectedIds().has(item.op.id));
  });

  setTab(tab: 'pending' | 'completed' | 'invoiced'): void {
    this.activeTab.set(tab);
    this.clearSelection();
    this.currentPage.set(1);
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    this.currentPage.set(1);
  }

  setSearchField(field: 'all' | 'job' | 'plate' | 'operation' | 'status') {
    this.searchField = field;
    this.currentPage.set(1);
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      const ids = new Set(this.filteredOperations().map((item) => item.op.id));
      this.selectedIds.set(ids);
    }
  }

  toggleSelect(id: string): void {
    this.selectedIds.update((ids) => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  calculateTotal(op: VehicleOperation): number {
    if (op.actualPrice) return op.actualPrice;
    if (op.actualDuration && op.hourlyRate) {
      return (op.actualDuration / 60) * op.hourlyRate;
    }
    return op.operation?.defaultPrice || 0;
  }

  openCompleteModal(item: { op: VehicleOperation; product: any }): void {
    this.selectedItem.set(item);
    this.completeForm = {
      operatorId: item.op.assignedUserId || '',
      duration: item.op.operation?.estimatedDuration || 0,
      hourlyRate: 45,
      notes: '',
    };
    (document.getElementById('complete_modal') as HTMLDialogElement)?.showModal();
  }

  calculateCompleteTotal(): number {
    if (!this.completeForm.duration || !this.completeForm.hourlyRate) return 0;
    return (this.completeForm.duration / 60) * this.completeForm.hourlyRate;
  }

  completeOperation(): void {
    const item = this.selectedItem();
    if (!item) return;

    this.operationService
      .updateVehicleOperation(item.op.id, {
        status: 'completed',
        actualDuration: this.completeForm.duration,
        hourlyRate: this.completeForm.hourlyRate,
        assignedUserId: this.completeForm.operatorId,
        notes: this.completeForm.notes,
        completedAt: new Date(),
      })
      .subscribe(() => {
        (document.getElementById('complete_modal') as HTMLDialogElement)?.close();
      });
  }

  markAsInvoiced(id: string): void {
    const operation = this.allOperations().find((item) => item.op.id === id);
    this.operationService.bulkMarkInvoiced([id]).subscribe(() => {
      if (operation?.op.vehicleId) {
        this.vehicleService.updateProductStatusByVehicleId(operation.op.vehicleId, 'invoiced').subscribe();
      }
    });
  }

  invoiceSelection(): void {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    const vehicleIds = Array.from(
      new Set(
        this.allOperations()
          .filter((item) => ids.includes(item.op.id))
          .map((item) => item.op.vehicleId),
      ),
    );

    this.operationService.bulkMarkInvoiced(ids).subscribe(() => {
      vehicleIds.forEach((vehicleId) =>
        this.vehicleService.updateProductStatusByVehicleId(vehicleId, 'invoiced').subscribe(),
      );
      this.clearSelection();
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'badge-ghost',
      scheduled: 'badge-info',
      in_progress: 'badge-warning',
      completed: 'badge-success',
      invoiced: 'badge-primary',
      cancelled: 'badge-error',
    };
    return classes[status] || 'badge-ghost';
  }

  nextPage() {
    if (this.currentPage() >= this.totalPages()) return;
    this.currentPage.update((p) => p + 1);
  }

  prevPage() {
    if (this.currentPage() <= 1) return;
    this.currentPage.update((p) => p - 1);
  }
}

