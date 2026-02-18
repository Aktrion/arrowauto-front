import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Product,
  ProductActivityEvent,
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

interface BackendProduct {
  _id?: string;
  id?: string;
  vehicleId?: string | { _id?: string; id?: string };
  vehicle?: { _id?: string; id?: string };
  customerId?: string;
  statusId?: string;
  inspectionTemplateId?: string;
  inspectionValueIds?: string[];
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
  private readonly productsApiUrl = `${environment.apiUrl}/products`;
  private readonly statusStepsApiUrl = `${environment.apiUrl}/status-steps`;

  private _vehicles = signal<Product[]>([]);
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
      vehicles: this.http
        .get<any>(this.vehiclesApiUrl)
        .pipe(
          map((response) => this.normalizeArrayResponse<BackendVehicle>(response)),
          catchError(() => of([])),
        ),
      products: this.http
        .get<any>(this.productsApiUrl)
        .pipe(
          map((response) => this.normalizeArrayResponse<BackendProduct>(response)),
          catchError(() => of([])),
        ),
      statusSteps: this.http
        .get<any>(this.statusStepsApiUrl)
        .pipe(
          map((response) => this.normalizeArrayResponse<BackendStatusStep>(response)),
          catchError(() => of([])),
        ),
    }).subscribe(({ vehicles, products, statusSteps }) => {
      this._statusSteps.set(statusSteps);
      const statusById = new Map(
        statusSteps.map((step) => [step._id || step.id || '', step.name || '']),
      );
      const latestProductByVehicleId = new Map<string, BackendProduct>();

      products.forEach((product) => {
        const productVehicleId = this.extractEntityId(product.vehicleId || product.vehicle);
        if (!productVehicleId) return;
        const current = latestProductByVehicleId.get(productVehicleId);
        if (!current) {
          latestProductByVehicleId.set(productVehicleId, product);
          return;
        }
        const currentDate = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
        const productDate = product.updatedAt ? new Date(product.updatedAt).getTime() : 0;
        if (productDate >= currentDate) {
          latestProductByVehicleId.set(productVehicleId, product);
        }
      });

      this.productIdByVehicleId.clear();
      this._vehicles.set(
        vehicles.map((vehicle) => {
          const vehicleId = vehicle._id || vehicle.id || '';
          const product = latestProductByVehicleId.get(vehicleId);
          if (product?._id || product?.id) {
            this.productIdByVehicleId.set(vehicleId, product._id || product.id || '');
          }
          const statusName = product?.statusId ? statusById.get(product.statusId) : '';
          return this.mapToProduct(vehicle, product, statusName);
        }),
      );
      this.loaded.set(true);
    });
  }

  getVehicleById(id: string): Product | undefined {
    return this._vehicles().find((v) => v.id === id || v.vehicleId === id);
  }

  getVehicleByPlate(plate: string): Product | undefined {
    return this._vehicles().find(
      (v) => v.vehicle?.licensePlate.toLowerCase() === plate.toLowerCase(),
    );
  }

  getProductIdByVehicleId(vehicleId: string): string | undefined {
    return this.productIdByVehicleId.get(vehicleId);
  }

  getProductCandidatesByVehicleId(vehicleId: string) {
    const preferredId = this.productIdByVehicleId.get(vehicleId);

    return this.http.get<BackendProduct[]>(this.productsApiUrl).pipe(
      map((products) => {
        const candidates = products
          .filter((product) => product.vehicleId === vehicleId)
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
          .map((product) => product._id || product.id || '')
          .filter(Boolean);

        if (preferredId) {
          return [preferredId, ...candidates.filter((id) => id !== preferredId)];
        }

        return candidates;
      }),
      catchError(() => of(preferredId ? [preferredId] : [])),
    );
  }

  getAllProducts() {
    return this.http.get<any>(this.productsApiUrl).pipe(
      map((response) =>
        this.normalizeArrayResponse<BackendProduct>(response).map((product) => ({
          ...product,
          vehicleId: this.extractEntityId(product.vehicleId || product.vehicle),
        })),
      ),
      catchError(() => of([])),
    );
  }

  getProductById(productId: string) {
    return this.http.get<any>(`${this.productsApiUrl}/${productId}`).pipe(
      map((product) =>
        this.normalizeSingleResponse<BackendProduct>(product)
          ? {
              ...this.normalizeSingleResponse<BackendProduct>(product),
              vehicleId: this.extractEntityId(
                this.normalizeSingleResponse<BackendProduct>(product)?.vehicleId ||
                  this.normalizeSingleResponse<BackendProduct>(product)?.vehicle,
              ),
            }
          : null,
      ),
      catchError(() => of(null)),
    );
  }

  updateProductStatusByVehicleId(
    vehicleId: string,
    target: VehicleStatus,
  ) {
    const productId = this.productIdByVehicleId.get(vehicleId);
    const statusId = this.resolveStatusStepId(target);
    if (!productId || !statusId) {
      return of(null);
    }

    return this.http
      .patch(`${this.productsApiUrl}/${productId}`, { statusId })
      .pipe(
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

  addVehicleProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'jobNumber' | 'status'>) {
    const payload = {
      vin:
        product.vehicle?.vin?.trim() ||
        this.generateFallbackVin(product.vehicle?.licensePlate),
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
          .post<BackendProduct>(this.productsApiUrl, {
            vehicleId,
            customerId: product.customerId || undefined,
            inspectionTemplateId: product.inspectionTemplateId || undefined,
            code: `PRD-${Date.now().toString().slice(-6)}`,
          })
          .pipe(
            catchError(() => of(undefined as unknown as BackendProduct)),
            switchMap((createdProduct) =>
              this.http
                .get<BackendVehicle>(`${this.vehiclesApiUrl}/${vehicleId}`)
                .pipe(map((freshVehicle) => ({ freshVehicle, createdProduct }))),
            ),
          );
      }),
      map(({ freshVehicle, createdProduct }) => {
        const created = this.mapToProduct(freshVehicle, createdProduct);
        if (createdProduct?._id || createdProduct?.id) {
          this.productIdByVehicleId.set(
            created.vehicleId || '',
            createdProduct._id || createdProduct.id || '',
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
      : this.http.get<BackendProduct[]>(this.productsApiUrl).pipe(
          map((products) => this.resolveLatestProductIdByVehicleId(products, vehicleId)),
          catchError(() => of(undefined)),
        );

    return productId$.pipe(
      switchMap((productId) => {
        if (!productId) {
          return of([] as ProductActivityEvent[]);
        }

        return this.http
          .get<BackendProductActivityResponse>(`${this.productsApiUrl}/${productId}/activity`)
          .pipe(
            map((response) =>
              (response.data || []).map((event) => ({
                type: (event.type || 'movements_updated') as ProductActivityEvent['type'],
                occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
                actorName: event.actorName,
                message: event.message || 'Event',
                metadata: event.metadata || {},
              })),
            ),
            catchError(() => of([] as ProductActivityEvent[])),
          );
      }),
    );
  }

  updateVehicleProduct(id: string, updates: Partial<Product>) {
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

    return this.http.patch<BackendVehicle>(`${this.vehiclesApiUrl}/${target.vehicleId}`, payload).pipe(
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
          .patch(`${this.productsApiUrl}/${productId}`, productPayload)
          .pipe(catchError(() => of(null)));
      }),
    );
  }

  private mapToProduct(
    vehicle: BackendVehicle,
    product?: BackendProduct,
    statusName?: string,
  ): Product {
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

  private resolveStatusStepId(
    target: VehicleStatus,
  ): string | undefined {
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

  private resolveLatestProductIdByVehicleId(products: BackendProduct[], vehicleId: string) {
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
