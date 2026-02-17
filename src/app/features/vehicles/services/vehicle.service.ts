import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Product, Vehicle, VehicleStatus } from '../models/vehicle.model';

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
  vehicleId?: string;
  customerId?: string;
  statusId?: string;
  inspectionTemplateId?: string;
  operations?: string[];
  updatedAt?: string;
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
      vehicles: this.http.get<BackendVehicle[]>(this.vehiclesApiUrl).pipe(catchError(() => of([]))),
      products: this.http.get<BackendProduct[]>(this.productsApiUrl).pipe(catchError(() => of([]))),
      statusSteps: this.http
        .get<BackendStatusStep[]>(this.statusStepsApiUrl)
        .pipe(catchError(() => of([]))),
    }).subscribe(({ vehicles, products, statusSteps }) => {
      this._statusSteps.set(statusSteps);
      const statusById = new Map(
        statusSteps.map((step) => [step._id || step.id || '', step.name || '']),
      );
      const latestProductByVehicleId = new Map<string, BackendProduct>();

      products.forEach((product) => {
        if (!product.vehicleId) return;
        const current = latestProductByVehicleId.get(product.vehicleId);
        if (!current) {
          latestProductByVehicleId.set(product.vehicleId, product);
          return;
        }
        const currentDate = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
        const productDate = product.updatedAt ? new Date(product.updatedAt).getTime() : 0;
        if (productDate >= currentDate) {
          latestProductByVehicleId.set(product.vehicleId, product);
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

  updateProductStatusByVehicleId(
    vehicleId: string,
    target: 'inspection' | 'in_progress' | 'awaiting_approval' | 'completed' | 'invoiced',
  ) {
    const productId = this.productIdByVehicleId.get(vehicleId);
    const statusId = this.resolveStatusStepId(target);
    if (!productId || !statusId) {
      return of(null);
    }

    return this.http
      .patch(`${this.productsApiUrl}/${productId}`, { statusId })
      .pipe(
        tap(() => this.loadVehicles()),
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
        if (!productId || !updates.customerId) {
          return of(null);
        }
        return this.http
          .patch(`${this.productsApiUrl}/${productId}`, { customerId: updates.customerId })
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
    target: 'inspection' | 'in_progress' | 'awaiting_approval' | 'completed' | 'invoiced',
  ): string | undefined {
    const statusSteps = this._statusSteps();
    const matchers: Record<typeof target, string[]> = {
      inspection: ['inspection'],
      in_progress: ['in progress', 'repair', 'working'],
      awaiting_approval: ['awaiting approval', 'waiting approval', 'approval'],
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
}
