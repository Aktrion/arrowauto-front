import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, switchMap } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { ICONS } from '../../../shared/icons';
import { VehicleService } from '../services/vehicle.service';
import { ClientService } from '../../clients/services/client.service';
import { OperationService } from '../../../shared/services/service.service';
import {
  OperationApiService,
  OperationMaster,
} from '../../../shared/services/operation-api.service';
import { OperationStatus, VehicleOperation } from '../../../shared/models';
import {
  Product,
  ProductActivityEvent,
  Vehicle,
  VehicleInstance,
  VehicleStatus,
} from '../models/vehicle.model';
import { NotificationService } from '../../../core/services/notification.service';
import { InspectionTemplatesService } from '../../settings/inspection-templates/services/inspection-templates.service';

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
  private operationApiService = inject(OperationApiService);
  private notificationService = inject(NotificationService);
  private inspectionTemplatesService = inject(InspectionTemplatesService);

  masterOperations = this.operationApiService.operations;
  selectedOperationId = signal('');

  isNew = signal(false);
  product = signal<Partial<Product>>({
    vehicle: {} as Vehicle,
    status: 'pending',
  });
  clients = this.clientService.clients;
  inspectionTemplates = computed(() =>
    this.inspectionTemplatesService
      .templates()
      .filter((template) => template.active)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  activeTab = signal('details');
  activityTimeline = signal<ProductActivityEvent[]>([]);
  activityLoading = signal(false);
  operationSaving = signal<Record<string, boolean>>({});
  hpiResult = signal(false);
  foundVehicle = signal<Vehicle | null>(null);
  existingVehicleId = signal<string | null>(null);
  lookupLoading = signal(false);
  private lookupSubject$ = new Subject<{ field: 'vin' | 'licensePlate'; value: string }>();
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
  readonly operationStatusOptions: OperationStatus[] = [
    'pending',
    'scheduled',
    'in_progress',
    'completed',
    'invoiced',
    'cancelled',
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
        this.loadActivityTimeline(id);
        return;
      }

      if (this.vehicleService.loaded()) {
        this.router.navigate(['/vehicles']);
      }
    });

    // Debounced lookup for duplicate detection
    this.lookupSubject$
      .pipe(
        debounceTime(500),
        distinctUntilChanged((a, b) => a.field === b.field && a.value === b.value),
        filter((v) => v.value.trim().length >= 3),
      )
      .subscribe(({ field, value }) => {
        this.lookupLoading.set(true);
        this.vehicleService.lookupVehicle(field, value).subscribe((vehicle) => {
          this.lookupLoading.set(false);
          if (vehicle) {
            this.foundVehicle.set(vehicle);
          } else {
            this.foundVehicle.set(null);
            this.existingVehicleId.set(null);
          }
        });
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
        this.loadActivityTimeline(id);
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

  onFieldLookup(field: 'vin' | 'licensePlate', value: string) {
    if (!this.isNew()) return;
    this.lookupSubject$.next({ field, value });
  }

  useExistingVehicle() {
    const vehicle = this.foundVehicle();
    if (!vehicle) return;
    this.product.update((p) => ({
      ...p,
      vehicle: {
        ...p.vehicle!,
        ...vehicle,
      },
    }));
    this.existingVehicleId.set(vehicle.id || null);
    this.hpiResult.set(true);
  }

  dismissDuplicate() {
    this.foundVehicle.set(null);
    this.existingVehicleId.set(null);
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
      const existingId = this.existingVehicleId();
      if (existingId) {
        // Link to existing vehicle instead of creating a new one
        this.vehicleService.addVehicleInstanceForExistingVehicle(existingId, p as any).subscribe({
          next: () => {
            this.notificationService.success(
              'Vehicle instance created and linked to existing vehicle.',
            );
            this.router.navigate(['/vehicles']);
          },
          error: () => this.notificationService.error('Failed to create vehicle instance.'),
        });
      } else {
        this.vehicleService.addVehicleProduct(p as any).subscribe({
          next: () => {
            this.notificationService.success('Vehicle created successfully.');
            this.router.navigate(['/vehicles']);
          },
          error: () => this.notificationService.error('Failed to create vehicle.'),
        });
      }
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
          next: () => {
            if (p.status) {
              this.initialStatus.set(p.status);
            }
            this.notificationService.success('Vehicle updated successfully.');
            this.router.navigate(['/vehicles']);
          },
          error: () => this.notificationService.error('Failed to update vehicle.'),
        });
    }
  }

  getVehicleOperations(vehicleId: string) {
    return this.operationService.getVehicleOperations(vehicleId);
  }

  addOperationFromMaster() {
    const id = this.selectedOperationId();
    const vehicleId = this.product().id;
    if (!id || !vehicleId) return;

    const master = this.operationApiService.getById(id);
    if (!master) return;

    this.operationService.addVehicleOperationFromMaster(vehicleId, master).subscribe({
      next: () => {
        this.selectedOperationId.set('');
        this.notificationService.success(`Operation "${master.shortName}" added.`);
      },
      error: () => this.notificationService.error('Failed to add operation.'),
    });
  }

  removeOperation(op: VehicleOperation) {
    const vehicleId = this.product().id;
    if (!vehicleId || !op.id) return;

    this.operationService.removeVehicleOperation(vehicleId, op.id).subscribe({
      next: () => this.notificationService.success('Operation removed.'),
      error: () => this.notificationService.error('Failed to remove operation.'),
    });
  }

  getOperationsStats(vehicleId: string) {
    const operations = this.getVehicleOperations(vehicleId);
    const completed = operations.filter(
      (operation) => operation.status === 'completed' || operation.status === 'invoiced',
    ).length;
    return {
      total: operations.length,
      completed,
      progress: operations.length ? Math.round((completed / operations.length) * 100) : 0,
    };
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

  isOperationSaving(operationId: string) {
    return Boolean(this.operationSaving()[operationId]);
  }

  setActiveTab(tab: 'details' | 'operations' | 'history') {
    this.activeTab.set(tab);
    if (tab === 'history') {
      const vehicleId = this.product().id || this.routeId();
      if (vehicleId) {
        this.loadActivityTimeline(vehicleId);
      }
    }
  }

  getTimelineCardClass(index: number): string {
    return index % 2 === 0 ? 'md:col-start-1' : 'md:col-start-3';
  }

  onStatusChange(status: VehicleStatus) {
    this.product.update((current) => ({
      ...current,
      status,
    }));
  }

  updateOperationStatus(operation: VehicleOperation, status: OperationStatus) {
    if (!operation.id || operation.status === status) {
      return;
    }

    this.operationSaving.update((state) => ({ ...state, [operation.id]: true }));
    this.operationService.updateVehicleOperation(operation.id, { status }).subscribe({
      next: () => {
        this.operationSaving.update((state) => ({ ...state, [operation.id]: false }));
        this.notificationService.success('Operation updated successfully.');
      },
      error: () => {
        this.operationSaving.update((state) => ({ ...state, [operation.id]: false }));
        this.notificationService.error('Failed to update operation.');
      },
    });
  }

  updateOperationField(operation: VehicleOperation, field: 'duration' | 'rate', event: Event) {
    if (!operation.id || !operation.operation) return;
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;

    const updatedOp = { ...operation.operation };
    if (field === 'duration') {
      updatedOp.estimatedDuration = value;
    } else {
      updatedOp.defaultPrice = value;
    }

    const updates: Partial<VehicleOperation> = { operation: updatedOp };
    if (field === 'duration') updates.actualDuration = value;
    if (field === 'rate') updates.hourlyRate = value;

    this.operationService.updateVehicleOperation(operation.id, updates).subscribe({
      next: () => this.notificationService.success('Operation details updated.'),
      error: () => this.notificationService.error('Failed to update operation details.'),
    });
  }

  private loadActivityTimeline(vehicleId: string) {
    this.activityLoading.set(true);
    this.vehicleService.getActivityTimelineByVehicleId(vehicleId).subscribe({
      next: (events) => {
        this.activityTimeline.set(events);
        this.activityLoading.set(false);
      },
      error: () => {
        this.activityTimeline.set([]);
        this.activityLoading.set(false);
      },
    });
  }

  goToInspection() {
    const vehicleId = this.product().id || this.routeId();
    if (!vehicleId) return;
    const instanceId = this.vehicleService.getVehicleInstanceIdByVehicleId(vehicleId);
    if (!instanceId) {
      this.notificationService.warning('Vehicle has no inspection instance. Create one first.');
      return;
    }
    this.router.navigate(['/inspection', instanceId]);
  }
}
