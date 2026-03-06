import {
  Component,
  computed,
  effect,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { ICONS } from '@shared/icons';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { VehiclesApiService } from '@features/vehicles/services/api/vehicles-api.service';
import { VehicleStatusUtils } from '@shared/utils/vehicle-status.utils';
import { Client } from '@features/clients/models/client.model';
import { ClientService } from '@features/clients/services/client.service';
import { OperationService } from '@shared/services/operation.service';
import { OperationMaster } from '@shared/models/operation.model';
import { OperationStatus, VehicleOperation } from '@shared/models/operation.model';
import {
  Vehicle,
  VehicleInstance,
  VehicleInstanceActivityEvent,
  VehicleInstanceApiResponse,
  VehicleStatus,
} from '@features/vehicles/models/vehicle.model';
import { ToastService } from '@core/services/toast.service';
import { InspectionTemplate } from '@features/settings/inspection-templates/models/inspection-template.model';
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
export class VehicleInstanceDetailComponent implements OnInit, OnDestroy {
  icons = ICONS;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private instanceApi = inject(VehicleInstancesApiService);
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private visibilityHandler = () => this.refetchWhenVisible();
  private vehiclesApi = inject(VehiclesApiService);
  private clientService = inject(ClientService);
  private operationService = inject(OperationService);
  private notificationService = inject(ToastService);
  private inspectionTemplatesService = inject(InspectionTemplatesService);
  private translateService = inject(TranslateService);

  masterOperations = signal<OperationMaster[]>([]);
  vehicleOperations = signal<any[]>([]);
  selectedOperationId = signal('');

  isNew = signal(false);

  /** Form model for editable fields - synced with vehicle instance */
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
    distanceUnit: 'miles' | 'km';
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
    status: 'checked_in',
    customerId: '',
    inspectionTemplateId: '',
    distanceUnit: 'km',
  });

  /** Signal Forms - main form with validation */
  detailForm = form(this.formModel, (s) => {
    required(s.vehicle.licensePlate);
    required(s.vehicle.make);
    required(s.customerId);
    required(s.inspectionTemplateId);
  });

  /** Vehicle instance metadata from API (_id, code, vehicleId, etc.) */
  vehicleInstance = signal<Partial<VehicleInstance>>({
    vehicle: {} as Vehicle,
    status: 'checked_in',
  });
  clients = signal<Client[]>([]);
  inspectionTemplates = computed(() =>
    this.inspectionTemplatesService
      .templates()
      .filter((template) => template.active)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  activeTab = signal('details');
  activityTimeline = signal<VehicleInstanceActivityEvent[]>([]);
  activityLoading = signal(false);
  operationSaving = signal<Record<string, boolean>>({});
  submittingToCustomer = signal(false);
  hpiResult = signal(false);
  foundVehicle = signal<Vehicle | null>(null);
  existingVehicleId = signal<string | null>(null);
  lookupLoading = signal(false);
  private lookupSubject$ = new Subject<{ field: 'vin' | 'licensePlate'; value: string }>();
  private routeId = signal<string>('');
  private initialStatus = signal<VehicleStatus>('checked_in');
  readonly statusOptions: VehicleStatus[] = [
    'checked_in',
    'pending_inspection',
    'pending_estimation',
    'pending_approval',
    'pending_operations',
    'ready_for_pickup',
    'checked_out',
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

  /** Resolves vehicleId or vehicleInstanceId for operations lookup (handles API transform) */
  operationsVehicleIdOrInstanceId = computed(() => {
    const p = this.vehicleInstance();
    const api = p as VehicleInstanceApiResponse;
    return (
      p.vehicleId ??
      api.vehicle?._id ??
      p._id ??
      ''
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
  distanceUnitSelectOptions: SelectOption[] = [
    { label: 'Kilometers (km)', value: 'km' },
    { label: 'Miles (mi)', value: 'miles' },
  ];

  clientSelectOptions = computed<SelectOption[]>(() =>
    this.clients().map((c: Client) => ({
      label: `${c.name} - ${c.company || 'Private'}`,
      value: c.id,
    })),
  );

  inspectionTemplateSelectOptions = computed<SelectOption[]>(() =>
    this.inspectionTemplates().map((t: InspectionTemplate) => ({
      label: t.name,
      value: t._id ?? '',
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
      this.refetchVehicleInstance(id);
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
        this.resetVehicleInstance();
      } else {
        this.routeId.set(id);
        this.loadActivityTimeline(id);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  private refetchWhenVisible() {
    if (document.visibilityState !== 'visible') return;
    const id = this.routeId();
    if (!id || id === 'new' || this.isNew()) return;
    this.ngZone.run(() => this.refetchVehicleInstance(id));
  }

  private refetchVehicleInstance(id: string) {
    this.instanceApi.findOne(id).subscribe({
      next: (found) => {
        const normalized = this.normalizeVehicleInstanceFromApi(found);
        this.vehicleInstance.set(normalized);
        this.syncFormModelFromVehicleInstance(normalized);
        this.isNew.set(false);
        this.initialStatus.set((normalized.status ?? 'checked_in') as VehicleStatus);
        this.loadActivityTimeline(id);
      },
      error: () => this.router.navigate(['/vehicles-instances']),
    });
  }

  resetVehicleInstance() {
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
      status: 'checked_in',
      customerId: '',
      inspectionTemplateId: '',
      distanceUnit: 'km',
    });
    this.vehicleInstance.set({ status: 'checked_in', vehicle: {} as Vehicle });
    this.initialStatus.set('checked_in');
  }

  private syncFormModelFromVehicleInstance(p: Partial<VehicleInstanceApiResponse>) {
    const v = p.vehicle;
    const customerId =
      p.customerId ??
      p.customer?._id ??
      p.customer?.id ??
      '';
    const inspectionTemplateId =
      p.inspectionTemplateId ?? p.inspectionTemplate?._id ?? '';
    const nextEntry = v?.nextEntryDate;
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
        model: v?.model ?? v?.vehicleModel ?? '',
        colour: v?.colour ?? '',
        vin: v?.vin ?? '',
        mileage: p.mileage ?? (p as any).odometer ?? 0,
        engine: v?.engine ?? '',
        description: v?.description ?? '',
        year: v?.year ?? 0,
        nextEntryDate: nextEntryStr,
      },
      status: (typeof p.status === 'string' ? p.status : p.status?.name) ?? 'checked_in',
      customerId,
      inspectionTemplateId,
      distanceUnit: p.distanceUnit ?? 'km',
    });
  }

  onFieldLookup(field: 'vin' | 'licensePlate', value: string) {
    this.lookupSubject$.next({ field, value });
  }

  private autoFillVehicleFromLookup(vehicle: Vehicle) {
    const normalized = {
      ...vehicle,
      model: vehicle.model ?? vehicle.vehicleModel ?? '',
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
    const p = this.vehicleInstance();
    if (!this.canSave()) return;

    const vehiclePayload = {
      licensePlate: m.vehicle.licensePlate,
      make: m.vehicle.make,
      model: m.vehicle.model,
      colour: m.vehicle.colour,
      vin: m.vehicle.vin,
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
          })
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
    p: Partial<VehicleInstance>,
    vehicleId: string,
  ): Partial<VehicleInstance> {
    const raw = p as Record<string, unknown>;
    return {
      vehicleId,
      status: m.status as VehicleStatus,
      customerId: m.customerId,
      inspectionTemplateId: m.inspectionTemplateId,
      mileage: m.vehicle.mileage,
      distanceUnit: m.distanceUnit ?? 'km',
      movements: raw['movements'] as string[] | undefined,
    };
  }

  private buildInstanceUpdatePayload(
    m: ReturnType<typeof this.formModel>,
    p: Partial<VehicleInstance>,
  ): Partial<VehicleInstance> {
    const raw = p as Record<string, unknown>;
    return {
      vehicleId: p.vehicleId,
      status: m.status as VehicleStatus,
      customerId: m.customerId,
      inspectionTemplateId: m.inspectionTemplateId,
      mileage: m.vehicle.mileage,
      distanceUnit: m.distanceUnit ?? 'km',
      movements: raw['movements'] as string[] | undefined,
    };
  }

  private buildInstancePayloadWithOnlyChangedFields(
    m: ReturnType<typeof this.formModel>,
    p: Partial<VehicleInstanceApiResponse>,
  ): Record<string, unknown> {
    const savedCustomerId =
      p.customerId ??
      p.customer?._id ??
      p.customer?.id ??
      '';
    const savedInspectionTemplateId =
      p.inspectionTemplateId ?? p.inspectionTemplate?._id ?? '';
    const savedStatus = typeof p.status === 'string' ? p.status : p.status?.name ?? '';
    const savedMileage = p.mileage ?? (p as any).odometer ?? 0;
    const savedDistanceUnit = p.distanceUnit ?? 'km';

    const payload: Record<string, unknown> = {};
    if (m.status !== savedStatus) payload['status'] = m.status;
    if (m.customerId !== savedCustomerId) payload['customerId'] = m.customerId || undefined;
    if (m.inspectionTemplateId !== savedInspectionTemplateId)
      payload['inspectionTemplateId'] = m.inspectionTemplateId || undefined;
    if (Number(m.vehicle.mileage) !== Number(savedMileage))
      payload['mileage'] = m.vehicle.mileage;
    if (m.distanceUnit !== savedDistanceUnit) payload['distanceUnit'] = m.distanceUnit;
    return payload;
  }

  private buildVehiclePayloadWithOnlyChangedFields(
    m: ReturnType<typeof this.formModel>,
    v: Partial<Vehicle> | undefined,
  ): Record<string, unknown> | null {
    if (!v) return null;
    const payload: Record<string, unknown> = {};
    const fields: (keyof typeof m.vehicle)[] = [
      'licensePlate',
      'make',
      'model',
      'colour',
      'vin',
      'engine',
      'description',
      'year',
      'nextEntryDate',
    ];
    let hasChanges = false;
    for (const key of fields) {
      const formVal = m.vehicle[key];
      let savedVal: unknown;
      if (key === 'nextEntryDate') {
        const ne = v.nextEntryDate;
        savedVal =
          typeof ne === 'string'
            ? ne.slice(0, 10)
            : ne instanceof Date
              ? ne.toISOString().slice(0, 10)
              : '';
      } else {
        savedVal = (v as Record<string, unknown>)[key];
      }
      const formNormalized =
        typeof formVal === 'number' ? formVal : String(formVal ?? '').trim();
      const savedNormalized =
        typeof savedVal === 'number'
          ? savedVal
          : String(savedVal ?? '').trim();
      if (formNormalized !== savedNormalized) {
        payload[key] = formVal;
        hasChanges = true;
      }
    }
    return hasChanges ? payload : null;
  }

  getVehicleOperations(vehicleId: string) {
    return this.operationService.getVehicleOperationsByVehicleId(
      this.vehicleOperations(),
      vehicleId,
    );
  }

  addOperationFromMaster() {
    const id = this.selectedOperationId();
    const vehicleId = this.vehicleInstance().vehicleId ?? (this.vehicleInstance() as VehicleInstanceApiResponse).vehicle?._id;
    if (!id || !vehicleId) return;

    const master = this.masterOperations().find((o) => o.id === id);
    if (!master) return;

    const currentOps = this.getVehicleOperations(this.operationsVehicleIdOrInstanceId());
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
    const vehicleId = this.vehicleInstance().vehicleId ?? (this.vehicleInstance() as VehicleInstanceApiResponse).vehicle?._id;
    if (!vehicleId || !op.id) return;

    const currentOps = this.getVehicleOperations(this.operationsVehicleIdOrInstanceId());
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

  getOperationsStats(vehicleIdOrInstanceId: string) {
    const operations = this.getVehicleOperations(
      vehicleIdOrInstanceId || this.operationsVehicleIdOrInstanceId(),
    );
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

  isSubmittingToCustomer() {
    return this.submittingToCustomer();
  }

  submitToCustomer() {
    const p = this.vehicleInstance();
    if (!p._id || this.submittingToCustomer()) return;
    this.submittingToCustomer.set(true);
    this.instanceApi
      .update(p._id, { status: 'pending_approval' })
      .subscribe({
        next: (updated) => {
          this.submittingToCustomer.set(false);
          const normalized = this.normalizeVehicleInstanceFromApi(updated);
          this.vehicleInstance.set(normalized);
          this.syncFormModelFromVehicleInstance(normalized);
          this.notificationService.success('Estimation submitted to customer.');
        },
        error: () => {
          this.submittingToCustomer.set(false);
          this.notificationService.error('Failed to submit to customer.');
        },
      });
  }

  setActiveTab(tab: 'details' | 'operations' | 'history') {
    this.activeTab.set(tab);
    if (tab === 'history') {
      const vehicleId = this.vehicleInstance()._id || this.routeId();
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

  onDistanceUnitChange(distanceUnit: string) {
    const normalized = distanceUnit === 'miles' ? 'miles' : 'km';
    this.formModel.update((m) => ({ ...m, distanceUnit: normalized }));
  }

  getDistanceUnitLabel(distanceUnit: 'miles' | 'km' | undefined) {
    return distanceUnit === 'miles' ? 'mi' : 'km';
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
      next: (events: VehicleInstanceActivityEvent[]) => {
        this.activityTimeline.set(events);
        this.activityLoading.set(false);
      },
      error: () => {
        this.activityTimeline.set([]);
        this.activityLoading.set(false);
      },
    });
  }

  private normalizeVehicleInstanceFromApi(
    p: Partial<VehicleInstanceApiResponse>,
  ): Partial<VehicleInstance> {
    const out = { ...p } as Partial<VehicleInstance>;
    const api = p as VehicleInstanceApiResponse;
    if (api.customer?._id) out.customerId = api.customer._id;
    if (api.inspectionTemplate?._id)
      out.inspectionTemplateId = api.inspectionTemplate._id;
    if (out.vehicle) {
      out.vehicle = {
        ...out.vehicle,
        model: out.vehicle.model ?? out.vehicle.vehicleModel ?? '',
      };
    }
    const rawStatus = api.status;
    if (typeof rawStatus === 'object' && rawStatus?.name) {
      const legacyMap: Record<string, VehicleStatus> = {
        'Checked In': 'checked_in',
        Inspection: 'pending_inspection',
        'Waiting Approval': 'pending_approval',
        'In Repair': 'pending_operations',
        'Ready for Pickup': 'ready_for_pickup',
        Pending: 'checked_in',
        Completed: 'ready_for_pickup',
        Invoiced: 'ready_for_pickup',
      };
      out.status = legacyMap[rawStatus.name] ?? 'checked_in';
    } else if (typeof rawStatus !== 'string') {
      out.status = 'checked_in';
    }
    return out;
  }

  goToInspection() {
    const instanceId = this.vehicleInstance()._id || this.routeId();
    if (!instanceId) return;
    this.router.navigate(['/inspection', instanceId]);
  }

  cancelGeneralInfo() {
    this.syncFormModelFromVehicleInstance(this.vehicleInstance());
  }

  saveGeneralInfo() {
    const m = this.formModel();
    const p = this.vehicleInstance();
    if (!this.canSave()) return;

    const instancePayload = this.buildInstancePayloadWithOnlyChangedFields(m, p);
    const vehiclePayload = this.buildVehiclePayloadWithOnlyChangedFields(
      m,
      p.vehicle,
    );

    const ops: Observable<unknown>[] = [];
    if (Object.keys(instancePayload).length > 0) {
      ops.push(this.instanceApi.update(p._id!, instancePayload));
    }
    if (p.vehicleId && vehiclePayload) {
      ops.push(this.vehiclesApi.update(p.vehicleId, vehiclePayload));
    }
    if (ops.length === 0) return;

    forkJoin(ops).subscribe({
      next: () => {
        this.instanceApi.findOne(p._id!).subscribe({
          next: (updated) => {
            const normalized = this.normalizeVehicleInstanceFromApi(updated);
            this.vehicleInstance.set(normalized);
            this.syncFormModelFromVehicleInstance(normalized);
            this.notificationService.success(
              this.translateService.instant('VEHICLE.DETAIL.GENERAL_INFO_UPDATED'),
            );
          },
        });
      },
      error: () =>
        this.notificationService.error(
          this.translateService.instant('VEHICLE.DETAIL.GENERAL_INFO_UPDATE_FAILED'),
        ),
    });
  }
}
