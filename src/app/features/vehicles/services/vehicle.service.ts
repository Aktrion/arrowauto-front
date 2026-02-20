import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  VehicleInstance,
  VehicleInstanceActivityEvent,
  Vehicle,
  VehicleStatus,
} from '../models/vehicle.model';

interface BackendVehicle {
  _id?: string;
  id?: string;
  vin?: string;
  licensePlate: string;
  make: string;
  model?: string;
  vehicleModel?: string;
  description?: string;
  colour?: string;
  registrationDate?: string;
  engine?: string;
  nextEntryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendVehicleInstance {
  _id?: string;
  id?: string;
  vehicleId?: string | { _id?: string; id?: string };
  vehicle?: { _id?: string; id?: string };
  customerId?: string;
  statusId?: string;
  inspectionTemplateId?: string;
  inspectionValueIds?: string[];
  services?: string[];
  // Legacy compatibility field
  operations?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface BackendProductActivityEvent {
  type?: string;
  occurredAt?: string;
  actorName?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

interface BackendProductActivityResponse {
  vehicleInstanceId?: string;
  // Legacy compatibility field
  productId?: string;
  total?: number;
  data?: BackendProductActivityEvent[];
}

interface BackendStatusStep {
  _id?: string;
  id?: string;
  name?: string;
  order?: number;
}

interface BackendSearchResponse<T> {
  data: T[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private readonly http = inject(HttpClient);
  private readonly vehiclesApiUrl = `${environment.apiUrl}/vehicles`;
  private readonly vehicleInstancesApiUrl = `${environment.apiUrl}/vehicle-instances`;
  private readonly statusStepsApiUrl = `${environment.apiUrl}/status-steps`;

  private _vehicles = signal<VehicleInstance[]>([]);
  private _statusSteps = signal<BackendStatusStep[]>([]);
  readonly loaded = signal(false);
  readonly vehicles = this._vehicles.asReadonly();
  private productIdByVehicleId = new Map<string, string>();

  constructor() {
    this.loadVehicles();
  }

  loadVehicles() {
    this.loaded.set(false);
    return forkJoin({
      vehicles: this.http.get<any>(this.vehiclesApiUrl).pipe(
        map((response) => this.normalizeArrayResponse<BackendVehicle>(response)),
        catchError(() => of([])),
      ),
      vehicleInstances: this.http.get<any>(this.vehicleInstancesApiUrl).pipe(
        map((response) => this.normalizeArrayResponse<BackendVehicleInstance>(response)),
        catchError(() => of([])),
      ),
      statusSteps: this.http.get<any>(this.statusStepsApiUrl).pipe(
        map((response) => this.normalizeArrayResponse<BackendStatusStep>(response)),
        catchError(() => of([])),
      ),
    }).subscribe(({ vehicles, vehicleInstances, statusSteps }) => {
      this._statusSteps.set(statusSteps);
      const statusById = new Map(
        statusSteps.map((step) => [step._id || step.id || '', step.name || '']),
      );
      const latestVehicleInstanceByVehicleId = new Map<string, BackendVehicleInstance>();

      vehicleInstances.forEach((vehicleInstance) => {
        const vehicleId = this.extractEntityId(
          vehicleInstance.vehicleId || vehicleInstance.vehicle,
        );
        if (!vehicleId) return;
        const current = latestVehicleInstanceByVehicleId.get(vehicleId);
        if (!current) {
          latestVehicleInstanceByVehicleId.set(vehicleId, vehicleInstance);
          return;
        }
        const currentDate = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
        const instanceDate = vehicleInstance.updatedAt
          ? new Date(vehicleInstance.updatedAt).getTime()
          : 0;
        if (instanceDate >= currentDate) {
          latestVehicleInstanceByVehicleId.set(vehicleId, vehicleInstance);
        }
      });

      this.productIdByVehicleId.clear();
      this._vehicles.set(
        vehicles.map((vehicle) => {
          const vehicleId = vehicle._id || vehicle.id || '';
          const vehicleInstance = latestVehicleInstanceByVehicleId.get(vehicleId);
          if (vehicleInstance?._id || vehicleInstance?.id) {
            this.productIdByVehicleId.set(
              vehicleId,
              vehicleInstance._id || vehicleInstance.id || '',
            );
          }
          const statusName = vehicleInstance?.statusId
            ? statusById.get(vehicleInstance.statusId)
            : '';
          return this.mapToProduct(vehicle, vehicleInstance, statusName);
        }),
      );
      this.loaded.set(true);
    });
  }

  getVehicleById(id: string): VehicleInstance | undefined {
    return this._vehicles().find((v) => v.id === id || v.vehicleId === id);
  }

  getVehicleByPlate(plate: string): VehicleInstance | undefined {
    return this._vehicles().find(
      (v) => v.vehicle?.licensePlate.toLowerCase() === plate.toLowerCase(),
    );
  }

  getVehicleInstanceIdByVehicleId(vehicleId: string): string | undefined {
    return this.productIdByVehicleId.get(vehicleId);
  }

  // Legacy alias
  getProductIdByVehicleId(vehicleId: string): string | undefined {
    return this.getVehicleInstanceIdByVehicleId(vehicleId);
  }

  getProductCandidatesByVehicleId(vehicleId: string) {
    const preferredId = this.productIdByVehicleId.get(vehicleId);

    return this.http.get<BackendVehicleInstance[]>(this.vehicleInstancesApiUrl).pipe(
      map((vehicleInstances) => {
        const candidates = vehicleInstances
          .filter((vehicleInstance) => vehicleInstance.vehicleId === vehicleId)
          .sort((a, b) => {
            const aInspectionCount = (a.inspectionValueIds || []).length;
            const bInspectionCount = (b.inspectionValueIds || []).length;
            if (aInspectionCount !== bInspectionCount) {
              return bInspectionCount - aInspectionCount;
            }
            const aUpdatedAt = a.updatedAt || a.createdAt || '';
            const bUpdatedAt = b.updatedAt || b.createdAt || '';
            return new Date(bUpdatedAt).getTime() - new Date(aUpdatedAt).getTime();
          })
          .map((vehicleInstance) => vehicleInstance._id || vehicleInstance.id || '')
          .filter(Boolean);

        if (preferredId) {
          return [preferredId, ...candidates.filter((id) => id !== preferredId)];
        }

        return candidates;
      }),
      catchError(() => of(preferredId ? [preferredId] : [])),
    );
  }

  getAllVehicleInstances() {
    return this.http.get<any>(this.vehicleInstancesApiUrl).pipe(
      map((response) =>
        this.normalizeArrayResponse<BackendVehicleInstance>(response).map((vehicleInstance) => ({
          ...vehicleInstance,
          vehicleId: this.extractEntityId(vehicleInstance.vehicleId || vehicleInstance.vehicle),
        })),
      ),
      catchError(() => of([])),
    );
  }

  // Legacy alias
  getAllProducts() {
    return this.getAllVehicleInstances();
  }

  getVehicleInstanceById(vehicleInstanceId: string) {
    return this.http.get<any>(`${this.vehicleInstancesApiUrl}/${vehicleInstanceId}`).pipe(
      map((product) =>
        this.normalizeSingleResponse<BackendVehicleInstance>(product)
          ? {
              ...this.normalizeSingleResponse<BackendVehicleInstance>(product),
              vehicleId: this.extractEntityId(
                this.normalizeSingleResponse<BackendVehicleInstance>(product)?.vehicleId ||
                  this.normalizeSingleResponse<BackendVehicleInstance>(product)?.vehicle,
              ),
            }
          : null,
      ),
      catchError(() => of(null)),
    );
  }

  // Legacy alias
  getProductById(productId: string) {
    return this.getVehicleInstanceById(productId);
  }

  updateProductStatusByVehicleId(vehicleId: string, target: VehicleStatus) {
    const productId = this.productIdByVehicleId.get(vehicleId);
    const statusId = this.resolveStatusStepId(target);
    if (!productId || !statusId) {
      return of(null);
    }

    return this.http.patch(`${this.vehicleInstancesApiUrl}/${productId}`, { statusId }).pipe(
      tap(() => {
        this._vehicles.update((vehicles) =>
          vehicles.map((item) =>
            item.vehicleId === vehicleId || item.id === vehicleId
              ? {
                  ...item,
                  status: target,
                  updatedAt: new Date(),
                }
              : item,
          ),
        );
        this.loadVehicles();
      }),
      catchError(() => of(null)),
    );
  }

  findVehicleByPlate(licensePlate: string) {
    return this.http
      .post<BackendSearchResponse<BackendVehicle>>(`${this.vehiclesApiUrl}/search`, {
        page: 1,
        limit: 1,
        filters: {
          licensePlate: {
            value: licensePlate.trim(),
            operator: 'equals',
          },
        },
      })
      .pipe(
        map((res) => (res.data?.[0] ? this.mapVehicle(res.data[0]) : null)),
        catchError(() => of(null)),
      );
  }

  lookupVehicle(field: 'vin' | 'licensePlate', value: string) {
    if (!value || value.trim().length < 3) return of(null);
    return this.http
      .get<BackendVehicle | null>(`${this.vehiclesApiUrl}/lookup`, {
        params: { field, value: value.trim() },
      })
      .pipe(
        map((res) => (res ? this.mapVehicle(res) : null)),
        catchError(() => of(null)),
      );
  }

  addVehicleInstanceForExistingVehicle(
    existingVehicleId: string,
    product: Partial<VehicleInstance>,
  ) {
    return this.http
      .post<BackendVehicleInstance>(this.vehicleInstancesApiUrl, {
        vehicleId: existingVehicleId,
        customerId: product.customerId || undefined,
        inspectionTemplateId: product.inspectionTemplateId || undefined,
        code: `PRD-${Date.now().toString().slice(-6)}`,
      })
      .pipe(
        switchMap((createdVehicleInstance) =>
          this.http
            .get<BackendVehicle>(`${this.vehiclesApiUrl}/${existingVehicleId}`)
            .pipe(map((freshVehicle) => ({ freshVehicle, createdVehicleInstance }))),
        ),
        map(({ freshVehicle, createdVehicleInstance }) => {
          const created = this.mapToProduct(freshVehicle, createdVehicleInstance);
          if (createdVehicleInstance?._id || createdVehicleInstance?.id) {
            this.productIdByVehicleId.set(
              created.vehicleId || '',
              createdVehicleInstance._id || createdVehicleInstance.id || '',
            );
          }
          return created;
        }),
        tap((created) => this._vehicles.update((vehicles) => [created, ...vehicles])),
        catchError(() => of(null)),
      );
  }

  addVehicleProduct(
    product: Omit<VehicleInstance, 'id' | 'createdAt' | 'updatedAt' | 'jobNumber' | 'status'>,
  ) {
    const payload = {
      vin: product.vehicle?.vin?.trim() || this.generateFallbackVin(product.vehicle?.licensePlate),
      licensePlate: product.vehicle?.licensePlate?.trim() || '',
      make: product.vehicle?.make?.trim() || '',
      model: product.vehicle?.model?.trim() || '',
      description: product.vehicle?.description?.trim() || undefined,
      colour: product.vehicle?.colour?.trim() || undefined,
      registrationDate: product.vehicle?.registrationDate || undefined,
      engine: product.vehicle?.engine?.trim() || undefined,
      nextEntryDate: product.vehicle?.next_entry || undefined,
    };

    return this.http.post<BackendVehicle>(this.vehiclesApiUrl, payload).pipe(
      switchMap((createdVehicle) => {
        const vehicleId = createdVehicle._id || createdVehicle.id || '';
        return this.http
          .post<BackendVehicleInstance>(this.vehicleInstancesApiUrl, {
            vehicleId,
            customerId: product.customerId || undefined,
            inspectionTemplateId: product.inspectionTemplateId || undefined,
            code: `PRD-${Date.now().toString().slice(-6)}`,
          })
          .pipe(
            catchError(() => of(undefined as unknown as BackendVehicleInstance)),
            switchMap((createdVehicleInstance) =>
              this.http
                .get<BackendVehicle>(`${this.vehiclesApiUrl}/${vehicleId}`)
                .pipe(map((freshVehicle) => ({ freshVehicle, createdVehicleInstance }))),
            ),
          );
      }),
      map(({ freshVehicle, createdVehicleInstance }) => {
        const created = this.mapToProduct(freshVehicle, createdVehicleInstance);
        if (createdVehicleInstance?._id || createdVehicleInstance?.id) {
          this.productIdByVehicleId.set(
            created.vehicleId || '',
            createdVehicleInstance._id || createdVehicleInstance.id || '',
          );
        }
        return created;
      }),
      tap((created) => this._vehicles.update((vehicles) => [created, ...vehicles])),
    );
  }

  getActivityTimelineByVehicleId(vehicleId: string) {
    const knownProductId = this.productIdByVehicleId.get(vehicleId);
    const productId$ = knownProductId
      ? of(knownProductId)
      : this.http.get<BackendVehicleInstance[]>(this.vehicleInstancesApiUrl).pipe(
          map((products) => this.resolveLatestProductIdByVehicleId(products, vehicleId)),
          catchError(() => of(undefined)),
        );

    return productId$.pipe(
      switchMap((productId) => {
        if (!productId) {
          return of([] as VehicleInstanceActivityEvent[]);
        }

        return this.http
          .get<BackendProductActivityResponse>(
            `${this.vehicleInstancesApiUrl}/${productId}/activity`,
          )
          .pipe(
            map((response) =>
              (response.data || []).map((event) => ({
                type: (event.type || 'movements_updated') as VehicleInstanceActivityEvent['type'],
                occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
                actorName: event.actorName,
                message: event.message || 'Event',
                metadata: event.metadata || {},
              })),
            ),
            catchError(() => of([] as VehicleInstanceActivityEvent[])),
          );
      }),
    );
  }

  updateVehicleProduct(id: string, updates: Partial<VehicleInstance>) {
    const target = this.getVehicleById(id);
    if (!target?.vehicleId) {
      return of(null);
    }

    const vehicle = updates.vehicle || target.vehicle;
    const payload: Partial<BackendVehicle> = {
      vin: vehicle?.vin,
      licensePlate: vehicle?.licensePlate,
      make: vehicle?.make,
      model: vehicle?.model,
      description: vehicle?.description,
      colour: vehicle?.colour,
      registrationDate: vehicle?.registrationDate,
      engine: vehicle?.engine,
      nextEntryDate: vehicle?.next_entry,
    };

    return this.http
      .patch<BackendVehicle>(`${this.vehiclesApiUrl}/${target.vehicleId}`, payload)
      .pipe(
        tap((updatedVehicle) => {
          this._vehicles.update((vehicles) =>
            vehicles.map((item) =>
              item.id === target.id
                ? {
                    ...item,
                    customerId: updates.customerId ?? item.customerId,
                    vehicle: this.mapVehicle(updatedVehicle),
                    updatedAt: new Date(),
                  }
                : item,
            ),
          );
        }),
        switchMap(() => {
          const productId = this.productIdByVehicleId.get(target.vehicleId!);
          if (!productId) {
            return of(null);
          }
          const productPayload: Record<string, any> = {};
          if ('customerId' in updates) {
            productPayload['customerId'] = updates.customerId || null;
          }
          if ('inspectionTemplateId' in updates) {
            productPayload['inspectionTemplateId'] = updates.inspectionTemplateId || null;
          }
          if (Object.keys(productPayload).length === 0) {
            return of(null);
          }
          return this.http
            .patch(`${this.vehicleInstancesApiUrl}/${productId}`, productPayload)
            .pipe(catchError(() => of(null)));
        }),
      );
  }

  private mapToProduct(
    vehicle: BackendVehicle,
    product?: BackendVehicleInstance,
    statusName?: string,
  ): VehicleInstance {
    const vehicleId = vehicle._id || vehicle.id || '';
    return {
      id: vehicleId,
      vehicleId,
      customerId: product?.customerId,
      statusId: product?.statusId,
      inspectionTemplateId: product?.inspectionTemplateId,
      status: this.normalizeStatus(statusName),
      vehicle: this.mapVehicle(vehicle),
      distanceUnit: 'km',
      createdAt: vehicle.createdAt ? new Date(vehicle.createdAt) : undefined,
      updatedAt: vehicle.updatedAt ? new Date(vehicle.updatedAt) : undefined,
    };
  }

  private mapVehicle(vehicle: BackendVehicle): Vehicle {
    const createdAt = vehicle.createdAt ? new Date(vehicle.createdAt) : undefined;
    return {
      id: vehicle._id || vehicle.id,
      licensePlate: vehicle.licensePlate,
      make: vehicle.make,
      model: vehicle.model || vehicle.vehicleModel || '',
      description: vehicle.description,
      colour: vehicle.colour || '',
      vin: vehicle.vin,
      registrationDate: vehicle.registrationDate,
      engine: vehicle.engine,
      next_entry: vehicle.nextEntryDate,
      createdAt,
      updatedAt: vehicle.updatedAt ? new Date(vehicle.updatedAt) : undefined,
    };
  }

  private normalizeStatus(rawStatus?: string): VehicleStatus {
    const raw = (rawStatus || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (raw.includes('inspection')) return 'inspection';
    if (raw.includes('awaiting')) return 'awaiting_approval';
    if (raw.includes('approved')) return 'approved';
    if (raw.includes('completed')) return 'completed';
    if (raw.includes('invoice')) return 'invoiced';
    if (raw.includes('progress')) return 'in_progress';
    return 'pending';
  }

  private resolveStatusStepId(target: VehicleStatus): string | undefined {
    const statusSteps = this._statusSteps();
    const matchers: Record<typeof target, string[]> = {
      pending: ['pending', 'received', 'check in'],
      inspection: ['inspection'],
      in_progress: ['in progress', 'repair', 'working'],
      awaiting_approval: ['awaiting approval', 'waiting approval', 'approval'],
      approved: ['approved', 'authorised', 'authorized'],
      completed: ['completed', 'ready'],
      invoiced: ['invoiced', 'invoice'],
    };
    const keywords = matchers[target];

    const found = statusSteps.find((step) => {
      const normalized = (step.name || '').toLowerCase().replace(/[_-]/g, ' ');
      return keywords.some((keyword) => normalized.includes(keyword));
    });

    if (found?._id || found?.id) {
      return found._id || found.id;
    }
    return undefined;
  }

  private generateFallbackVin(licensePlate?: string): string {
    const normalized = (licensePlate || 'UNKNOWN').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return `VIN-${normalized.slice(0, 8).padEnd(8, 'X')}-${Date.now().toString().slice(-6)}`;
  }

  private resolveLatestProductIdByVehicleId(products: BackendVehicleInstance[], vehicleId: string) {
    const candidates = products.filter((product) => product.vehicleId === vehicleId);
    if (candidates.length === 0) {
      return undefined;
    }

    const latest = candidates.reduce((current, product) => {
      if (!current) {
        return product;
      }
      const currentDate = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
      const productDate = product.updatedAt ? new Date(product.updatedAt).getTime() : 0;
      return productDate >= currentDate ? product : current;
    }, candidates[0]);

    const productId = latest._id || latest.id;
    if (productId) {
      this.productIdByVehicleId.set(vehicleId, productId);
    }
    return productId;
  }

  private extractEntityId(
    ref?: string | { _id?: any; id?: any; $oid?: string; toString?: () => string } | null,
  ): string | undefined {
    if (!ref) {
      return undefined;
    }
    if (typeof ref === 'string') {
      return ref;
    }
    const nestedId = ref._id || ref.id || ref.$oid;
    if (typeof nestedId === 'string') {
      return nestedId;
    }
    if (nestedId && typeof nestedId === 'object') {
      const nested = this.extractEntityId(nestedId as any);
      if (nested) return nested;
    }
    if (typeof ref.toString === 'function') {
      const asString = ref.toString();
      if (asString && asString !== '[object Object]') {
        return asString;
      }
    }
    return undefined;
  }

  private normalizeArrayResponse<T>(response: any): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }
    if (Array.isArray(response?.data)) {
      return response.data as T[];
    }
    return [];
  }

  private normalizeSingleResponse<T>(response: any): T | null {
    if (!response) {
      return null;
    }
    if (response?.data && !Array.isArray(response.data)) {
      return response.data as T;
    }
    return response as T;
  }
}
