import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { OperationService } from '../../shared/services/operation.service';
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
  activeTab = signal<'pending' | 'completed' | 'invoiced'>('pending');
  selectedIds = signal<Set<string>>(new Set());
  selectedItem = signal<{ op: VehicleOperation; vehicle: any } | null>(null);

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
      vehicle: vehicles.find((v) => v.id === op.vehicleId),
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
      ops = ops.filter((item) => (item.op as any).invoiced === true);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      ops = ops.filter(
        (item) =>
          item.vehicle?.jobNumber?.toLowerCase().includes(query) ||
          item.vehicle?.licensePlate?.toLowerCase().includes(query)
      );
    }

    return ops;
  });

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

  invoicedTodayCount = signal(3);
  totalRevenueToday = signal(1250.0);

  allSelected = computed(() => {
    const filtered = this.filteredOperations();
    return filtered.length > 0 && filtered.every((item) => this.selectedIds().has(item.op.id));
  });

  setTab(tab: 'pending' | 'completed' | 'invoiced'): void {
    this.activeTab.set(tab);
    this.clearSelection();
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

  openCompleteModal(item: { op: VehicleOperation; vehicle: any }): void {
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

    this.operationService.updateVehicleOperation(item.op.id, {
      status: 'completed',
      actualDuration: this.completeForm.duration,
      hourlyRate: this.completeForm.hourlyRate,
      assignedUserId: this.completeForm.operatorId,
      notes: this.completeForm.notes,
      completedAt: new Date(),
    });

    (document.getElementById('complete_modal') as HTMLDialogElement)?.close();
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'badge-ghost',
      scheduled: 'badge-info',
      in_progress: 'badge-warning',
      completed: 'badge-success',
      cancelled: 'badge-error',
    };
    return classes[status] || 'badge-ghost';
  }
}
