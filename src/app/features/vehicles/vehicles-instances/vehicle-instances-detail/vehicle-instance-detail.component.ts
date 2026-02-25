import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, switchMap } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { ICONS } from '@shared/icons';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { VehiclesApiService } from '@features/vehicles/services/api/vehicles-api.service';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';
import { ClientService } from '@features/clients/services/client.service';
import { OperationService } from '@shared/services/operation.service';
import { OperationMaster } from '@shared/models/operation.model';
import { OperationStatus, VehicleOperation } from '@shared/models/service.model';
import {
  Product,
  ProductActivityEvent,
  Vehicle,
  VehicleInstance,
  VehicleStatus,
} from '@features/vehicles/models/vehicle.model';
import { ToastService } from '@core/services/toast.service';
import { InspectionTemplatesService } from '@features/settings/inspection-templates/services/inspection-templates.service';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';

@Component({
  selector: 'app-vehicle-instance-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslateModule,
    SelectComponent,
  ],
  templateUrl: './vehicle-instance-detail.component.html',
})
export class VehicleInstanceDetailComponent implements OnInit {
  icons = ICONS;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private instanceApi = inject(VehicleInstancesApiService);
  private vehiclesApi = inject(VehiclesApiService);
  private clientService = inject(ClientService);
  private operationService = inject(OperationService);
  private notificationService = inject(ToastService);
  private inspectionTemplatesService = inject(InspectionTemplatesService);

  masterOperations = signal<OperationMaster[]>([]);
  vehicleOperations = signal<any[]>([]);
  selectedOperationId = signal('');

  isNew = signal(false);
  product = signal<Partial<Product>>({
    vehicle: {} as Vehicle,
    status: 'pending',
  });
  clients = signal<any[]>([]);
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

  statusSelectOptions: SelectOption[] = this.statusOptions.map((s) => ({
    label: VehicleStatusUtils.formatStatus(s),
    value: s,
  }));

  operationStatusSelectOptions: SelectOption[] = this.operationStatusOptions.map((s) => ({
    label: VehicleStatusUtils.formatStatus(s),
    value: s,
  }));

  clientSelectOptions = computed<SelectOption[]>(() =>
    this.clients().map((c: any) => ({
      label: `${c.name} - ${c.company || 'Private'}`,
      value: c.id,
    })),
  );

  inspectionTemplateSelectOptions = computed<SelectOption[]>(() =>
    this.inspectionTemplates().map((t: any) => ({
      label: t.name,
      value: t._id,
    })),
  );

  masterOperationSelectOptions = computed<SelectOption[]>(() =>
    this.masterOperations().map((op) => ({
      label: `${op.shortName} — ${op.defaultDuration}min • £${op.defaultRatePerHour}/hr`,
      value: op.id,
    })),
  );

  constructor() {
    effect(() => {
      const id = this.routeId();
      if (!id || id === 'new') return;

      this.instanceApi.findOne(id).subscribe({
        next: (found) => {
          this.product.set({ ...found });
          this.isNew.set(false);
          this.initialStatus.set(found.status);
          this.loadActivityTimeline(id);
        },
        error: () => this.router.navigate(['/vehicles-instances']),
      });
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
        this.vehiclesApi.lookup(field, value).subscribe((vehicle) => {
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
    this.operationService
      .fetchData()
      .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
    this.operationService
      .fetchOperationMasters()
      .subscribe((ops) => this.masterOperations.set(ops));
    this.clientService.fetchClients().subscribe((c) => this.clients.set(c));
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id === 'new') {
        this.isNew.set(true);
        this.resetProduct();
      } else {
        this.routeId.set(id);
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
    this.existingVehicleId.set(vehicle._id || null);
    this.hpiResult.set(true);
  }

  dismissDuplicate() {
    this.foundVehicle.set(null);
    this.existingVehicleId.set(null);
  }

  performHPICheck() {
    const plate = this.product().vehicle?.licensePlate;
    if (!plate) return;

    this.vehiclesApi.lookup('licensePlate', plate).subscribe((vehicle) => {
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
        this.instanceApi.create({ ...p, vehicleId: existingId } as any).subscribe({
          next: () => {
            this.notificationService.success(
              'Vehicle instance created and linked to existing vehicle.',
            );
            this.router.navigate(['/vehicles']);
          },
          error: () => this.notificationService.error('Failed to create vehicle instance.'),
        });
      } else {
        this.instanceApi.create(p as any).subscribe({
          next: () => {
            this.notificationService.success('Vehicle created successfully.');
            this.router.navigate(['/vehicles']);
          },
          error: () => this.notificationService.error('Failed to create vehicle.'),
        });
      }
    } else {
      this.instanceApi
        .update(p._id!, p as any)
        .pipe(
          switchMap((updated) => {
            if (!p._id || !p.status || p.status === this.initialStatus()) {
              return of(updated);
            }
            return this.instanceApi.update(p._id!, { status: p.status } as any);
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
    return this.operationService.getVehicleOperationsByVehicleId(
      this.vehicleOperations(),
      vehicleId,
    );
  }

  addOperationFromMaster() {
    const id = this.selectedOperationId();
    const vehicleId = this.product().vehicleId;
    if (!id || !vehicleId) return;

    const master = this.masterOperations().find((o) => o.id === id);
    if (!master) return;

    const currentOps = this.getVehicleOperations(vehicleId);
    this.operationService.addVehicleOperationFromMaster(vehicleId, master, currentOps).subscribe({
      next: () => {
        this.selectedOperationId.set('');
        this.notificationService.success(`Operation "${master.shortName}" added.`);
        this.operationService
          .fetchData()
          .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
      },
      error: () => this.notificationService.error('Failed to add operation.'),
    });
  }

  removeOperation(op: VehicleOperation) {
    const vehicleId = this.product().vehicleId;
    if (!vehicleId || !op.id) return;

    const currentOps = this.getVehicleOperations(vehicleId);
    this.operationService.removeVehicleOperation(vehicleId, op.id, currentOps).subscribe({
      next: () => {
        this.notificationService.success('Operation removed.');
        this.operationService
          .fetchData()
          .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
      },
      error: () => this.notificationService.error('Failed to remove operation.'),
    });
  }

  getOperationsStats(vehicleId: string) {
    const operations = this.getVehicleOperations(vehicleId || this.product().vehicleId || '');
    const completed = operations.filter(
      (operation) => operation.status === 'completed' || operation.status === 'invoiced',
    ).length;
    return {
      total: operations.length,
      completed,
      progress: operations.length ? Math.round((completed / operations.length) * 100) : 0,
    };
  }

  // Bridge to Service Helpers
  formatStatus = (s?: string) => VehicleStatusUtils.formatStatus(s);
  getStatusBadgeClass = (s?: string) => VehicleStatusUtils.getStatusBadgeClass(s);

  getClientName(clientId?: string): string {
    if (!clientId) return 'Unassigned';
    return this.clientService.getClientById(this.clients(), clientId)?.name ?? 'Unknown';
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
      const vehicleId = this.product()._id || this.routeId();
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
    this.operationService
      .updateVehicleOperation(operation.id, { status }, this.vehicleOperations())
      .subscribe({
        next: () => {
          this.operationSaving.update((state) => ({ ...state, [operation.id]: false }));
          this.notificationService.success('Operation updated successfully.');
          this.operationService
            .fetchData()
            .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
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

    this.operationService
      .updateVehicleOperation(operation.id, updates, this.vehicleOperations())
      .subscribe({
        next: () => {
          this.notificationService.success('Operation details updated.');
          this.operationService
            .fetchData()
            .subscribe((d) => this.vehicleOperations.set(d.vehicleOperations));
        },
        error: () => this.notificationService.error('Failed to update operation details.'),
      });
  }

  private loadActivityTimeline(instanceId: string) {
    this.activityLoading.set(true);
    this.instanceApi.getActivityTimeline(instanceId).subscribe({
      next: (events: ProductActivityEvent[]) => {
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
    const instanceId = this.product()._id || this.routeId();
    if (!instanceId) return;
    this.router.navigate(['/inspection', instanceId]);
  }
}
