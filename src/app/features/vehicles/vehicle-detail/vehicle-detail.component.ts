import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../../shared/icons';
import { VehicleService } from '../services/vehicle.service';
import { ClientService } from '../../clients/services/client.service';
import { OperationService } from '../../../shared/services/operation.service';
import { Vehicle } from '../../../core/models';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, LucideAngularModule],
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
  vehicle = signal<Partial<Vehicle>>({});
  clients = this.clientService.clients;
  activeTab = signal('details');
  hpiResult = signal(false);

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id === 'new') {
        this.isNew.set(true);
        this.resetVehicle();
      } else {
        const found = this.vehicleService.getVehicleById(id);
        if (found) {
          this.vehicle.set({ ...found });
          this.isNew.set(false);
        } else {
          this.router.navigate(['/vehicles']);
        }
      }
    });
  }

  resetVehicle() {
    this.vehicle.set({
      licensePlate: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      registrationDate: '',
      engine: '',
      colour: '',
      vin: '',
      mileage: 0,
    });
  }

  performHPICheck() {
    const plate = this.vehicle().licensePlate;
    if (!plate) return;

    // Mock HPI check
    setTimeout(() => {
      this.vehicle.update((v) => ({
        ...v,
        make: 'BMW',
        model: '320d',
        year: 2022,
        registrationDate: '2022-01-14',
        engine: '2.0',
        colour: 'Black',
        vin: 'WBAXXXXXXXXX12345',
      }));
      this.hpiResult.set(true);
    }, 500);
  }

  save() {
    const v = this.vehicle();
    if (!v.licensePlate || !v.make || !v.model) return;

    if (this.isNew()) {
      this.vehicleService.addVehicle(v as any);
    } else {
      this.vehicleService.updateVehicle(v.id!, v);
    }
    this.router.navigate(['/vehicles']);
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
