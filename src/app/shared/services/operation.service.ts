import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, catchError } from 'rxjs';
import { Operation, OperationStatus, VehicleOperation } from '@shared/models/service.model';
import { OperationMaster } from '@shared/models/operation.model';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { OperationsApiService } from '@shared/services/api/operations-api.service';
import { OperationInstancesApiService } from '@shared/services/api/operation-instances-api.service';

@Injectable({
  providedIn: 'root',
})
export class OperationService {
  private readonly operationsApi = inject(OperationsApiService);
  private readonly operationInstancesApi = inject(OperationInstancesApiService);
  private readonly instanceApi = inject(VehicleInstancesApiService);

  // --- Operation Masters (catálogo, API /operations) ---

  fetchOperationMasters(): Observable<OperationMaster[]> {
    return this.operationsApi.fetchOperationMasters();
  }

  createOperationMaster(payload: Omit<OperationMaster, 'id'>): Observable<OperationMaster> {
    return this.operationsApi.create(payload) as Observable<OperationMaster>;
  }

  updateOperationMaster(id: string, payload: Partial<OperationMaster>): Observable<OperationMaster> {
    return this.operationsApi.update(id, payload) as Observable<OperationMaster>;
  }

  deleteOperationMaster(id: string): Observable<unknown> {
    return this.operationsApi.deleteOne(id);
  }

  // --- Vehicle Operations (workflow) ---

  /**
   * Fetch operations (status steps) and vehicle operations from backend.
   * Returns fresh data; components store in local state.
   */
  fetchData(): Observable<{ operations: Operation[]; vehicleOperations: VehicleOperation[] }> {
    return this.operationInstancesApi.getWorkflowData();
  }

  getVehicleOperationsByVehicleId(
    vehicleOperations: VehicleOperation[],
    vehicleId: string,
  ): VehicleOperation[] {
    return vehicleOperations.filter((vo) => vo.vehicleId === vehicleId);
  }

  addVehicleOperationFromMaster(
    vehicleId: string,
    master: {
      id: string;
      shortName: string;
      description?: string;
      defaultDuration: number;
      defaultRatePerHour: number;
    },
    currentVehicleOps: VehicleOperation[],
  ): Observable<VehicleOperation | null> {
    const operation: Operation = {
      id: master.id,
      code: master.shortName.slice(0, 6).toUpperCase(),
      name: master.shortName,
      description: master.description,
      estimatedDuration: master.defaultDuration,
      defaultPrice: master.defaultRatePerHour,
      category: 'other',
    };
    const newOperation: VehicleOperation = {
      id: `${vehicleId}-${master.id}-${Date.now()}`,
      vehicleId,
      operationId: master.id,
      operation,
      status: 'pending',
      hourlyRate: master.defaultRatePerHour,
    };

    return this.persistVehicleOperations(vehicleId, [...currentVehicleOps, newOperation]).pipe(
      map(() => newOperation),
    );
  }

  removeVehicleOperation(
    vehicleId: string,
    operationInstanceId: string,
    currentVehicleOps: VehicleOperation[],
  ): Observable<unknown> {
    const filtered = currentVehicleOps.filter((op) => op.id !== operationInstanceId);
    return this.persistVehicleOperations(vehicleId, filtered);
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
    vehicleOperations?: VehicleOperation[],
  ): Observable<VehicleOperation | null> {
    const isMongoId = /^[a-f\d]{24}$/i.test(id);
    if (isMongoId) {
      const payload: Record<string, unknown> = {
        status: updates.status,
        price: updates.actualPrice,
        assignedUser: updates.assignedUserId,
        scheduledDate: updates.scheduledDate,
      };
      Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

      return this.operationInstancesApi.update(id, payload).pipe(
        map(() => {
          const updated: VehicleOperation = {
            id,
            vehicleId: '',
            operationId: '',
            operation: { id: '', code: '', name: '', category: 'other', estimatedDuration: 0, defaultPrice: 0 },
            status: 'pending',
            ...updates,
          };
          return updated;
        }),
      );
    }

    const current = vehicleOperations?.find((op) => op.id === id);
    if (!current) return of(null);

    const updated: VehicleOperation = { ...current, ...updates };
    const vehicleOps = vehicleOperations!.map((item) => (item.id === id ? updated : item));
    return this.persistVehicleOperations(current.vehicleId, vehicleOps).pipe(map(() => updated));
  }

  bulkMarkInvoiced(
    ids: string[],
    vehicleOperations: VehicleOperation[],
  ): Observable<unknown> {
    const byVehicle = new Map<string, VehicleOperation[]>();
    vehicleOperations
      .filter((op) => ids.includes(op.id))
      .forEach((op) => {
        const list = byVehicle.get(op.vehicleId) || [];
        list.push(op);
        byVehicle.set(op.vehicleId, list);
      });

    const updates = Array.from(byVehicle.entries()).map(([vehicleId, ops]) => {
      const current = this.getVehicleOperationsByVehicleId(vehicleOperations, vehicleId);
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

    if (updates.length === 0) return of(null);

    return updates.reduce(
      (acc, request) => acc.pipe(switchMap(() => request)),
      of(null) as Observable<unknown>,
    );
  }

  private persistVehicleOperations(
    vehicleId: string,
    operations: VehicleOperation[],
  ): Observable<unknown> {
    return this.instanceApi.findInstanceByVehicleId(vehicleId).pipe(
      switchMap((instance) => {
        const productId = instance?._id;
        if (!productId) return of(null);

        const serializedServices = operations.map((op) =>
          JSON.stringify(this.normalizeOperationForStore(op)),
        );
        const payload = {
          services: serializedServices,
          operations: serializedServices,
        };

        return this.instanceApi.update(productId, payload).pipe(
          map(() => null),
          catchError(() => of(null)),
        );
      }),
    );
  }

  private normalizeOperationForStore(operation: VehicleOperation): VehicleOperation {
    return {
      ...operation,
      scheduledDate: operation.scheduledDate ? new Date(operation.scheduledDate) : undefined,
      completedAt: operation.completedAt ? new Date(operation.completedAt) : undefined,
    };
  }

}
