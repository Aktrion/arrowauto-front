import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Operation, OperationStatus, VehicleOperation } from '../models';
import { VehicleService } from '../../features/vehicles/services/vehicle.service';

interface BackendStatusStep {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
}

interface BackendProduct {
  _id?: string;
  id?: string;
  vehicleId?: string;
  services?: string[];
  // Legacy compatibility field
  operations?: string[];
  statusId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OperationService {
  private readonly http = inject(HttpClient);
  private readonly vehicleService = inject(VehicleService);
  private readonly statusStepsApiUrl = `${environment.apiUrl}/status-steps`;
  private readonly vehicleInstancesApiUrl = `${environment.apiUrl}/vehicle-instances`;

  private _operations = signal<Operation[]>([]);
  private _vehicleOperations = signal<VehicleOperation[]>([]);
  private _productIdByVehicleId = signal<Map<string, string>>(new Map());

  readonly operations = this._operations.asReadonly();
  readonly vehicleOperations = computed<VehicleOperation[]>(() => this._vehicleOperations());

  constructor() {
    this.refresh();
  }

  refresh() {
    this.loadOperations().add(() => this.loadVehicleOperationsFromProducts());
  }

  loadOperations() {
    return this.http
      .get<BackendStatusStep[]>(this.statusStepsApiUrl)
      .pipe(catchError(() => of([])))
      .subscribe((steps) => {
        this._operations.set(
          steps.map((step, index) => ({
            id: step._id || step.id || `op-${index + 1}`,
            code: (step.name || `STEP-${index + 1}`).slice(0, 3).toUpperCase(),
            name: step.name,
            description: step.description,
            category: 'inspection',
            estimatedDuration: 30,
            defaultPrice: 0,
          })),
        );
      });
  }

  loadVehicleOperationsFromProducts() {
    return this.http
      .get<BackendProduct[]>(this.vehicleInstancesApiUrl)
      .pipe(catchError(() => of([])))
      .subscribe((products) => {
        const flattened: VehicleOperation[] = [];
        const mapByVehicle = new Map<string, string>();

        products.forEach((product) => {
          const productId = product._id || product.id || '';
          const vehicleId = product.vehicleId || '';
          if (!productId || !vehicleId) return;

          mapByVehicle.set(vehicleId, productId);
          const parsed = this.parseProductOperations(
            product.services || product.operations || [],
            vehicleId,
          );
          if (parsed.length > 0) {
            flattened.push(...parsed);
          }
        });

        this._productIdByVehicleId.set(mapByVehicle);
        this._vehicleOperations.set(flattened);
      });
  }

  getOperationById(id: string): Operation | undefined {
    return this._operations().find((o) => o.id === id);
  }

  searchOperations(query: string): Operation[] {
    const lowerQuery = query.toLowerCase();
    return this._operations().filter(
      (o) => o.code.toLowerCase().includes(lowerQuery) || o.name.toLowerCase().includes(lowerQuery),
    );
  }

  getVehicleOperations(vehicleId: string): VehicleOperation[] {
    return this.vehicleOperations().filter((vo) => vo.vehicleId === vehicleId);
  }

  addVehicleOperation(vehicleId: string, operationId: string): Observable<VehicleOperation | null> {
    const operation = this.getOperationById(operationId);
    if (!operation) {
      return of(null);
    }

    const vehicleOps = this.getVehicleOperations(vehicleId);
    const newOperation: VehicleOperation = {
      id: `${vehicleId}-${operationId}-${Date.now()}`,
      vehicleId,
      operationId,
      operation,
      status: 'pending',
    };

    return this.persistVehicleOperations(vehicleId, [...vehicleOps, newOperation]).pipe(
      map(() => newOperation),
    );
  }

  assignVehicleOperation(
    operationId: string,
    payload: { assignedUserId: string; scheduledDate: Date; scheduledTime: string },
  ): Observable<VehicleOperation | null> {
    return this.updateVehicleOperation(operationId, {
      assignedUserId: payload.assignedUserId,
      scheduledDate: payload.scheduledDate,
      scheduledTime: payload.scheduledTime,
      status: 'scheduled',
    });
  }

  updateVehicleOperation(
    id: string,
    updates: Partial<VehicleOperation>,
  ): Observable<VehicleOperation | null> {
    const current = this._vehicleOperations().find((op) => op.id === id);
    if (!current) {
      return of(null);
    }

    const updated: VehicleOperation = {
      ...current,
      ...updates,
    };

    const vehicleOps = this
      .getVehicleOperations(current.vehicleId)
      .map((item) => (item.id === id ? updated : item));

    return this.persistVehicleOperations(current.vehicleId, vehicleOps).pipe(
      map(() => updated),
    );
  }

  bulkMarkInvoiced(ids: string[]): Observable<unknown> {
    const byVehicle = new Map<string, VehicleOperation[]>();
    this._vehicleOperations()
      .filter((op) => ids.includes(op.id))
      .forEach((op) => {
        const list = byVehicle.get(op.vehicleId) || [];
        list.push(op);
        byVehicle.set(op.vehicleId, list);
      });

    const updates = Array.from(byVehicle.entries()).map(([vehicleId, ops]) => {
      const current = this.getVehicleOperations(vehicleId);
      const next = current.map((op) =>
        ops.some((target) => target.id === op.id)
          ? {
              ...op,
              status: 'invoiced' as OperationStatus,
              completedAt: op.completedAt || new Date(),
            }
          : op,
      );
      return this.persistVehicleOperations(vehicleId, next);
    });

    if (updates.length === 0) {
      return of(null);
    }

    return updates.reduce(
      (acc, request) => acc.pipe(switchMap(() => request)),
      of(null) as Observable<unknown>,
    );
  }

  private persistVehicleOperations(
    vehicleId: string,
    operations: VehicleOperation[],
  ): Observable<unknown> {
    const productId = this.getProductIdByVehicleId(vehicleId);
    if (!productId) {
      return of(null);
    }

    const serializedServices = operations.map((op) =>
      JSON.stringify(this.normalizeOperationForStore(op)),
    );
    const payload = {
      services: serializedServices,
      // Legacy compatibility field
      operations: serializedServices,
    };

    return this.http.patch(`${this.vehicleInstancesApiUrl}/${productId}`, payload).pipe(
      tap(() => {
        const all = this._vehicleOperations().filter((item) => item.vehicleId !== vehicleId);
        this._vehicleOperations.set([...all, ...operations]);
      }),
      catchError(() => of(null)),
    );
  }

  private parseProductOperations(rawOperations: string[], vehicleId: string): VehicleOperation[] {
    const knownOperations = this._operations();
    return rawOperations.map((raw, idx) => {
      try {
        const parsed = JSON.parse(raw) as VehicleOperation;
        const operation = knownOperations.find((op) => op.id === parsed.operationId) || parsed.operation;
        return {
          ...parsed,
          id: parsed.id || `${vehicleId}-${parsed.operationId || idx}`,
          vehicleId: parsed.vehicleId || vehicleId,
          status: parsed.status || 'pending',
          operationId: parsed.operationId || operation?.id || `op-${idx + 1}`,
          operation,
          scheduledDate: parsed.scheduledDate ? new Date(parsed.scheduledDate) : undefined,
          completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
        };
      } catch {
        const fallback = knownOperations.find((op) => op.code === raw || op.name === raw);
        return {
          id: `${vehicleId}-${idx}-${raw}`,
          vehicleId,
          operationId: fallback?.id || `legacy-${idx + 1}`,
          operation:
            fallback ||
            ({
              id: `legacy-${idx + 1}`,
              code: raw.slice(0, 6).toUpperCase(),
              name: raw,
              category: 'inspection',
              estimatedDuration: 30,
              defaultPrice: 0,
            } as Operation),
          status: 'pending',
        };
      }
    });
  }

  private normalizeOperationForStore(operation: VehicleOperation): VehicleOperation {
    return {
      ...operation,
      scheduledDate: operation.scheduledDate ? new Date(operation.scheduledDate) : undefined,
      completedAt: operation.completedAt ? new Date(operation.completedAt) : undefined,
    };
  }

  private getProductIdByVehicleId(vehicleId: string): string | undefined {
    return (
      this._productIdByVehicleId().get(vehicleId) ||
      this.vehicleService.getProductIdByVehicleId(vehicleId)
    );
  }
}
