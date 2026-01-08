import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
  templateUrl: './customer-portal.component.html',
})
export class CustomerPortalComponent {
  vehicleData = {
    plate: 'CD56 IJK',
    make: 'Mercedes',
    model: 'C-Class',
    year: 2023,
  };

  repairItems: RepairItem[] = [
    {
      id: '1',
      name: 'Front Bumper',
      category: 'Exterior',
      severity: 'major',
      comment: 'Deep scratch on the front bumper, requires respray',
      partsCost: 45.0,
      laborCost: 120.0,
      photos: ['1', '2'],
      approved: false,
    },
    {
      id: '2',
      name: 'Driver Door',
      category: 'Exterior',
      severity: 'minor',
      comment: 'Small dent near handle',
      partsCost: 0,
      laborCost: 85.0,
      photos: ['3'],
      approved: false,
    },
    {
      id: '3',
      name: 'Front Left Wheel',
      category: 'Wheels',
      severity: 'minor',
      comment: 'Kerb damage on alloy wheel',
      partsCost: 0,
      laborCost: 65.0,
      photos: ['4'],
      approved: false,
    },
    {
      id: '4',
      name: 'Windscreen',
      category: 'Glass',
      severity: 'major',
      comment: 'Stone chip that may spread - recommend replacement',
      partsCost: 280.0,
      laborCost: 80.0,
      photos: ['5', '6'],
      approved: false,
    },
  ];

  inspectionCategories = [
    {
      name: 'Exterior',
      status: 'warning',
      okCount: 4,
      totalCount: 6,
      points: [
        { name: 'Front Bumper', status: 'defect' },
        { name: 'Rear Bumper', status: 'ok' },
        { name: 'Bonnet', status: 'ok' },
        { name: 'Roof', status: 'ok' },
        { name: 'Driver Door', status: 'warning' },
        { name: 'Passenger Door', status: 'ok' },
      ],
    },
    {
      name: 'Wheels',
      status: 'warning',
      okCount: 3,
      totalCount: 4,
      points: [
        { name: 'Front Left Wheel', status: 'warning' },
        { name: 'Front Right Wheel', status: 'ok' },
        { name: 'Rear Left Wheel', status: 'ok' },
        { name: 'Rear Right Wheel', status: 'ok' },
      ],
    },
    {
      name: 'Tyres',
      status: 'ok',
      okCount: 4,
      totalCount: 4,
      points: [
        { name: 'Front Left Tyre', status: 'ok' },
        { name: 'Front Right Tyre', status: 'ok' },
        { name: 'Rear Left Tyre', status: 'ok' },
        { name: 'Rear Right Tyre', status: 'ok' },
      ],
    },
    {
      name: 'Glass',
      status: 'warning',
      okCount: 1,
      totalCount: 2,
      points: [
        { name: 'Windscreen', status: 'defect' },
        { name: 'Rear Window', status: 'ok' },
      ],
    },
  ];

  cartIds = signal<Set<string>>(new Set());
  showSuccess = signal(false);

  cartItems = computed(() => this.repairItems.filter((item) => this.cartIds().has(item.id)));

  totalParts = computed(() => this.cartItems().reduce((sum, item) => sum + item.partsCost, 0));

  totalLabor = computed(() => this.cartItems().reduce((sum, item) => sum + item.laborCost, 0));

  subtotal = computed(() => this.totalParts() + this.totalLabor());
  totalVat = computed(() => this.subtotal() * 0.2);
  grandTotal = computed(() => this.subtotal() + this.totalVat());

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
    (document.getElementById('confirm_modal') as HTMLDialogElement)?.close();
    this.showSuccess.set(true);
    setTimeout(() => this.showSuccess.set(false), 3000);
  }
}
