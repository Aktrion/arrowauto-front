import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap, tap, Observable } from 'rxjs';
import {
  VehicleInstance,
  Product,
  VehicleInstanceActivityEvent,
  ProductActivityEvent,
  Vehicle,
  VehicleStatus,
  BackendStatusStep,
  BackendProductActivityResponse,
} from '../models/vehicle.model';
import { SortOrder } from '../../../shared/utils/search-request.class';
import { SearchRequestResponse } from '../../../core/models/request.model';

import { VehiclesApiService } from './api/vehicles-api.service';
import { VehicleInstancesApiService } from './api/vehicle-instances-api.service';
import { StatusStepsApiService } from './api/status-steps-api.service';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private vehiclesApi = inject(VehiclesApiService);
  private instanceApi = inject(VehicleInstancesApiService);
  private statusStepsApi = inject(StatusStepsApiService);

  // State Management
  vehicles = signal<Product[]>([]);
  statusSteps = signal<BackendStatusStep[]>([]);
  loaded = signal(false);

  // Helper map for legacy components
  private productIdByVehicleId = new Map<string, string>();

  /**
   * Fetch all vehicle instances (Products)
   */
  getAllVehicleInstances(): Observable<Product[]> {
    return this.instanceApi.findAll();
  }

  /**
   * Search vehicle instances with pagination
   */
  searchVehicles(params: any): Observable<SearchRequestResponse<Product>> {
    return this.instanceApi.findByPagination(params).pipe(
      tap((response) => {
        this.vehicles.set(response.data);
        this.loaded.set(true);

        // Update helper mapping
        response.data.forEach((instance) => {
          if (instance.vehicleId && instance._id) {
            this.productIdByVehicleId.set(instance.vehicleId, instance._id);
          }
        });
      }),
    );
  }

  /**
   * Search base vehicles from database with pagination
   */
  searchDatabase(params: any): Observable<SearchRequestResponse<Vehicle>> {
    return this.vehiclesApi.findByPagination(params);
  }

  /**
   * Fetch all workflow status steps
   */
  getStatusSteps(): Observable<BackendStatusStep[]> {
    return this.statusStepsApi.findAll().pipe(
      tap((steps) => this.statusSteps.set(steps)),
      catchError(() => of([])),
    );
  }

  /**
   * Find a vehicle instance from the local signal
   */
  getVehicleById(id: string): Product | undefined {
    return this.vehicles().find((v) => v._id === id);
  }

  /**
   * Load a single vehicle instance and update local state
   */
  loadOne(id: string): Observable<Product> {
    return this.instanceApi.findOne(id).pipe(
      tap((instance) => {
        // Update helper mapping
        if (instance.vehicleId && instance._id) {
          this.productIdByVehicleId.set(instance.vehicleId, instance._id);
        }

        this.vehicles.update((v) => {
          const exists = v.some((item) => item._id === id);
          return exists ? v.map((item) => (item._id === id ? instance : item)) : [...v, instance];
        });
      }),
    );
  }

  /**
   * Search for a vehicle by field (vin or license plate)
   */
  lookupVehicle(field: 'vin' | 'licensePlate', value: string): Observable<Vehicle | null> {
    return this.vehiclesApi.lookup(field, value);
  }

  /**
   * Simple wrapper for license plate lookup
   */
  findVehicleByPlate(plate: string): Observable<Vehicle | null> {
    return this.lookupVehicle('licensePlate', plate);
  }

  /**
   * Create a new vehicle AND its instance (Product)
   */
  addVehicleProduct(product: Partial<Product>): Observable<Product> {
    return this.instanceApi.create(product as Product).pipe(
      tap((newProduct) => {
        this.vehicles.update((v) => [newProduct, ...v]);
      }),
    );
  }

  /**
   * Create a new instance for an existing vehicle
   */
  addVehicleInstanceForExistingVehicle(
    vehicleId: string,
    product: Partial<Product>,
  ): Observable<Product> {
    const newInstance = { ...product, vehicleId };
    return this.instanceApi.create(newInstance as Product).pipe(
      tap((newProduct) => {
        this.vehicles.update((v) => [newProduct, ...v]);
      }),
    );
  }

  /**
   * Update an existing vehicle instance
   */
  updateVehicleProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.instanceApi.update(id, product).pipe(
      tap((updated) => {
        this.vehicles.update((v) => v.map((item) => (item._id === id ? updated : item)));
      }),
    );
  }

  /**
   * Update ONLY the status of a vehicle instance
   */
  updateProductStatusByVehicleId(id: string, status: VehicleStatus): Observable<Product> {
    return this.instanceApi.update(id, { status }).pipe(
      tap((updated) => {
        this.vehicles.update((v) => v.map((item) => (item._id === id ? updated : item)));
      }),
    );
  }

  /**
   * Fetch activity timeline for a vehicle instance
   */
  getActivityTimelineByVehicleId(id: string): Observable<ProductActivityEvent[]> {
    return this.instanceApi.getActivity(id).pipe(
      map((res) => {
        // Map backend events to ProductActivityEvent
        return (res.data || []).map((e: any) => ({
          type: e.type,
          occurredAt: e.occurredAt ? new Date(e.occurredAt) : new Date(),
          actorName: e.actorName,
          message: e.message,
          metadata: e.metadata,
        }));
      }),
      catchError(() => of([])),
    );
  }

  /**
   * Get the instance ID (Product ID) for a given Vehicle ID
   */
  getVehicleInstanceIdByVehicleId(vehicleId: string): string | undefined {
    return this.productIdByVehicleId.get(vehicleId);
  }

  // --- UI Helpers ---

  /**
   * Format status string for display
   */
  formatStatus(status?: string): string {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Get CSS class for status badge
   */
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

  /**
   * Get progress step (1-4) based on status
   */
  getProgressStep(status?: string): number {
    const progress: Record<string, number> = {
      pending: 1,
      inspection: 2,
      awaiting_approval: 2,
      in_progress: 3,
      approved: 3,
      completed: 4,
      invoiced: 4,
    };
    return progress[status || ''] || 0;
  }

  /**
   * Get progress percentage based on status
   */
  getProgressPercent(status?: string): number {
    return this.getProgressStep(status) * 25;
  }
}
