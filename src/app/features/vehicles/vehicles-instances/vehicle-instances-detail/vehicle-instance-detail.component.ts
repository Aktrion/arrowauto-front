import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, Subject } from 'rxjs';
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
import { BrandLogoComponent } from '@shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-vehicle-instance-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    FormField,
    RouterLink,
    LucideAngularModule,
    TranslateModule,
    SelectComponent,
    BrandLogoComponent,
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

  /** Form model for editable fields - synced with product */
  formModel = signal<{
    vehicle: {
      licensePlate: string;
      make: string;
      model: string;
      colour: string;
      vin: string;
      mileage: number;
      engine: string;
      description: string;
      year: number;
      nextEntryDate: string;
    };
    status: string;
    customerId: string;
    inspectionTemplateId: string;
  }>({
    vehicle: {
      licensePlate: '',
      make: '',
      model: '',
      colour: '',
      vin: '',
      mileage: 0,
      engine: '',
      description: '',
      year: 0,
      nextEntryDate: '',
    },
    status: 'pending',
    customerId: '',
    inspectionTemplateId: '',
  });

  /** Signal Forms - main form with validation */
  detailForm = form(this.formModel, (s) => {
    required(s.vehicle.licensePlate);
    required(s.vehicle.make);
    required(s.customerId);
    required(s.inspectionTemplateId);
  });

  /** Product metadata from API (_id, code, vehicleId, etc.) */
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

  canSave = computed(() => {
    const m = this.formModel();
    return (
      !!m.vehicle.licensePlate?.trim() &&
      !!m.vehicle.make?.trim() &&
      !!m.customerId &&
      !!m.inspectionTemplateId
    );
  });

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
          const normalized = this.normalizeProductFromApi(found);
          this.product.set(normalized);
          this.syncFormModelFromProduct(normalized);
          this.isNew.set(false);
          this.initialStatus.set(normalized.status ?? 'pending');
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
            this.autoFillVehicleFromLookup(vehicle);
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
    this.formModel.set({
      vehicle: {
        licensePlate: '',
        make: '',
        model: '',
        colour: '',
        vin: '',
        mileage: 0,
        engine: '',
        description: '',
        year: new Date().getFullYear(),
        nextEntryDate: '',
      },
      status: 'pending',
      customerId: '',
      inspectionTemplateId: '',
    });
    this.product.set({ status: 'pending', vehicle: {} as Vehicle });
    this.initialStatus.set('pending');
  }

  private syncFormModelFromProduct(p: Partial<Product>) {
    const v = p.vehicle;
    const nextEntry = (v as any)?.nextEntryDate;
    const nextEntryStr =
      nextEntry instanceof Date
        ? nextEntry.toISOString().slice(0, 10)
        : typeof nextEntry === 'string'
          ? nextEntry.slice(0, 10)
          : '';
    this.formModel.set({
      vehicle: {
        licensePlate: v?.licensePlate ?? '',
        make: v?.make ?? '',
        model: v?.model ?? (v as any)?.vehicleModel ?? '',
        colour: v?.colour ?? '',
        vin: v?.vin ?? '',
        mileage: v?.mileage ?? 0,
        engine: v?.engine ?? '',
        description: v?.description ?? '',
        year: v?.year ?? 0,
        nextEntryDate: nextEntryStr,
      },
      status: p.status ?? 'pending',
      customerId: p.customerId ?? '',
      inspectionTemplateId: p.inspectionTemplateId ?? '',
    });
  }

  onFieldLookup(field: 'vin' | 'licensePlate', value: string) {
    this.lookupSubject$.next({ field, value });
  }

  private autoFillVehicleFromLookup(vehicle: Vehicle) {
    const normalized = {
      ...vehicle,
      model: vehicle.model ?? (vehicle as any).vehicleModel ?? '',
    };
    this.formModel.update((m) => ({
      ...m,
      vehicle: {
        ...m.vehicle,
        licensePlate: normalized.licensePlate ?? m.vehicle.licensePlate,
        make: normalized.make ?? m.vehicle.make,
        model: normalized.model ?? m.vehicle.model,
        colour: normalized.colour ?? m.vehicle.colour,
        vin: normalized.vin ?? m.vehicle.vin,
        mileage: normalized.mileage ?? m.vehicle.mileage,
        engine: normalized.engine ?? m.vehicle.engine,
      },
    }));
  }

  useExistingVehicle() {
    const vehicle = this.foundVehicle();
    if (!vehicle) return;
    this.autoFillVehicleFromLookup(vehicle);
    this.existingVehicleId.set(vehicle._id || null);
    this.hpiResult.set(true);
  }

  dismissDuplicate() {
    this.foundVehicle.set(null);
    this.existingVehicleId.set(null);
  }

  performHPICheck() {
    const plate = this.formModel().vehicle.licensePlate;
    if (!plate) return;

    this.vehiclesApi.lookup('licensePlate', plate).subscribe((vehicle) => {
      if (!vehicle) {
        this.hpiResult.set(false);
        return;
      }
      this.autoFillVehicleFromLookup(vehicle);
      this.hpiResult.set(true);
    });
  }

  save() {
    const m = this.formModel();
    const p = this.product();
    if (!this.canSave()) return;

    const vehiclePayload = {
      licensePlate: m.vehicle.licensePlate,
      make: m.vehicle.make,
      model: m.vehicle.model,
      colour: m.vehicle.colour,
      vin: m.vehicle.vin,
      mileage: m.vehicle.mileage,
      engine: m.vehicle.engine,
      description: m.vehicle.description,
    };

    if (this.isNew()) {
      const existingId = this.existingVehicleId();
      if (existingId) {
        const instancePayload = this.buildInstanceCreatePayload(m, p, existingId);
        this.instanceApi.create(instancePayload).subscribe({
          next: () => {
            this.notificationService.success('Vehicle instance created and linked.');
            this.router.navigate(['/vehicles-instances']);
          },
          error: () => this.notificationService.error('Failed to create vehicle instance.'),
        });
      } else {
        this.vehiclesApi
          .create({
            ...vehiclePayload,
            vin: vehiclePayload.vin || 'TBD',
          } as any)
          .subscribe({
          next: (created) => {
            const vehicleId = created?._id;
            if (!vehicleId) {
              this.notificationService.error('Failed to create vehicle.');
              return;
            }
            const instancePayload = this.buildInstanceCreatePayload(m, p, vehicleId);
            this.instanceApi.create(instancePayload).subscribe({
              next: () => {
                this.notificationService.success('Vehicle instance created.');
                this.router.navigate(['/vehicles-instances']);
              },
              error: () => this.notificationService.error('Failed to create vehicle instance.'),
            });
          },
          error: () => this.notificationService.error('Failed to create vehicle.'),
        });
      }
    } else {
      const instancePayload = this.buildInstanceUpdatePayload(m, p);
      const ops: any[] = [this.instanceApi.update(p._id!, instancePayload)];
      if (p.vehicleId) {
        ops.push(this.vehiclesApi.update(p.vehicleId, vehiclePayload));
      }
      forkJoin(ops).subscribe({
        next: () => {
          if (m.status) this.initialStatus.set(m.status as VehicleStatus);
          this.notificationService.success('Vehicle updated successfully.');
          this.router.navigate(['/vehicles-instances']);
        },
        error: () => this.notificationService.error('Failed to update vehicle.'),
      });
    }
  }

  private buildInstanceCreatePayload(
    m: ReturnType<typeof this.formModel>,
    p: Partial<Product>,
    vehicleId: string,
  ): any {
    const raw = p as Record<string, unknown>;
    return {
      vehicleId,
      status: m.status,
      customerId: m.customerId,
      inspectionTemplateId: m.inspectionTemplateId,
      checkInDate: p.checkInDate,
      inspectionDate: p.inspectionDate,
      partsEstimatedDate: p.partsEstimatedDate,
      labourEstimatedDate: p.labourEstimatedDate,
      taskAuthDate: p.taskAuthDate,
      checkOutDate: p.checkOutDate,
      odometer: p.odometer,
      distanceUnit: (p as any).distanceUnit ?? 'km',
      services: p.services,
      operations: p.operations,
      movements: raw['movements'],
    };
  }

  private buildInstanceUpdatePayload(
    m: ReturnType<typeof this.formModel>,
    p: Partial<Product>,
  ): any {
    const raw = p as Record<string, unknown>;
    return {
      vehicleId: p.vehicleId,
      status: m.status,
      customerId: m.customerId,
      inspectionTemplateId: m.inspectionTemplateId,
      checkInDate: p.checkInDate,
      inspectionDate: p.inspectionDate,
      partsEstimatedDate: p.partsEstimatedDate,
      labourEstimatedDate: p.labourEstimatedDate,
      taskAuthDate: p.taskAuthDate,
      checkOutDate: p.checkOutDate,
      odometer: p.odometer,
      distanceUnit: p.distanceUnit,
      services: p.services,
      operations: p.operations,
      movements: raw['movements'],
    };
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

  onCustomerChange(customerId: string) {
    this.formModel.update((m) => ({ ...m, customerId }));
  }

  onInspectionTemplateChange(inspectionTemplateId: string) {
    this.formModel.update((m) => ({ ...m, inspectionTemplateId }));
  }

  onStatusChange(status: VehicleStatus) {
    this.formModel.update((m) => ({ ...m, status }));
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

  private normalizeProductFromApi(p: Partial<Product>): Partial<Product> {
    const out = { ...p };
    if (out.vehicle) {
      out.vehicle = {
        ...out.vehicle,
        model: out.vehicle.model ?? (out.vehicle as any).vehicleModel ?? '',
      };
    }
    const rawStatus = (out as any).status;
    if (typeof rawStatus === 'object' && rawStatus?.name) {
      const slugMap: Record<string, string> = {
        'Checked In': 'pending',
        Inspection: 'inspection',
        'Waiting Approval': 'awaiting_approval',
        'In Repair': 'in_progress',
        'Ready for Pickup': 'completed',
      };
      out.status = (slugMap[rawStatus.name] as VehicleStatus) ?? 'pending';
    }
    return out;
  }

  goToInspection() {
    const instanceId = this.product()._id || this.routeId();
    if (!instanceId) return;
    this.router.navigate(['/inspection', instanceId]);
  }
}
