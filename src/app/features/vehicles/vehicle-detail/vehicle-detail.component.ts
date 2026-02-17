import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';
import { ICONS } from '../../../shared/icons';
import { VehicleService } from '../services/vehicle.service';
import { ClientService } from '../../clients/services/client.service';
import { OperationService } from '../../../shared/services/operation.service';
import { Product, Vehicle, VehicleStatus } from '../models/vehicle.model';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLink, LucideAngularModule, TranslateModule],
  templateUrl: './vehicle-detail.component.html',
})
export class VehicleDetailComponent implements OnInit {
  icons = ICONS;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vehicleService = inject(VehicleService);
  private clientService = inject(ClientService);
  private operationService = inject(OperationService);

  isNew = signal(false);
  product = signal<Partial<Product>>({
    vehicle: {} as Vehicle,
    status: 'pending',
  });
  clients = this.clientService.clients;
  activeTab = signal('details');
  hpiResult = signal(false);
  private routeId = signal<string>('');
  private initialStatus = signal<VehicleStatus>('pending');
  readonly statusOptions: VehicleStatus[] = [
    'pending',
    'inspection',
    'in_progress',
    'awaiting_approval',
    'approved',
    'completed',
    'invoiced',
  ];

  constructor() {
    effect(() => {
      const id = this.routeId();
      if (!id || id === 'new') return;

      const found = this.vehicleService.getVehicleById(id);
      if (found) {
        this.product.set({ ...found });
        this.isNew.set(false);
        this.initialStatus.set(found.status);
        return;
      }

      if (this.vehicleService.loaded()) {
        this.router.navigate(['/vehicles']);
      }
    });
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id === 'new') {
        this.isNew.set(true);
        this.resetProduct();
      } else {
        this.routeId.set(id);
        this.vehicleService.loadVehicles();
      }
    });
  }

  resetProduct() {
    this.product.set({
      status: 'pending',
      vehicle: {
        licensePlate: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        registrationDate: '',
        engine: '',
        colour: '',
        vin: '',
        mileage: 0,
      },
    });
    this.initialStatus.set('pending');
  }

  performHPICheck() {
    const plate = this.product().vehicle?.licensePlate;
    if (!plate) return;

    this.vehicleService.findVehicleByPlate(plate).subscribe((vehicle) => {
      if (!vehicle) {
        this.hpiResult.set(false);
        return;
      }

      this.product.update((p) => ({
        ...p,
        vehicle: {
          ...p.vehicle!,
          ...vehicle,
        },
      }));
      this.hpiResult.set(true);
    });
  }

  save() {
    const p = this.product();
    if (!p.vehicle?.licensePlate || !p.vehicle?.make || !p.vehicle?.model) return;

    if (this.isNew()) {
      this.vehicleService.addVehicleProduct(p as any).subscribe({
        next: () => this.router.navigate(['/vehicles']),
      });
    } else {
      this.vehicleService
        .updateVehicleProduct(p.id!, p as any)
        .pipe(
          switchMap(() => {
            if (!p.id || !p.status || p.status === this.initialStatus()) {
              return of(null);
            }
            return this.vehicleService.updateProductStatusByVehicleId(p.id, p.status);
          }),
        )
        .subscribe({
          next: () => this.router.navigate(['/vehicles']),
        });
    }
  }

  getVehicleOperations(vehicleId: string) {
    return this.operationService.getVehicleOperations(vehicleId);
  }

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    const client = this.clientService.getClientById(clientId);
    return client?.name ?? 'Unknown';
  }

  formatStatus(status?: string): string {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  getStatusBadgeClass(status?: string): string {
    if (!status) return 'status-pending';
    const classes: Record<string, string> = {
      pending: 'status-pending',
      in_progress: 'status-in-progress',
      inspection: 'status-inspection',
      awaiting_approval: 'status-awaiting',
      approved: 'status-completed',
      completed: 'status-completed',
      invoiced: 'status-completed',
    };
    return classes[status] || 'status-pending';
  }

  getOperationStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'status-pending',
      scheduled: 'status-in-progress',
      in_progress: 'status-inspection',
      completed: 'status-completed',
      cancelled: 'status-error',
    };
    return classes[status] || 'status-pending';
  }
}
