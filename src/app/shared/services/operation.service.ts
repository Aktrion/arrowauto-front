import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { Operation, OperationStatus, VehicleOperation } from '@shared/models/operation.model';
import { OperationMaster } from '@shared/models/operation.model';
import { OperationsApiService } from '@shared/services/api/operations-api.service';
import { OperationInstancesApiService } from '@shared/services/api/operation-instances-api.service';
import { ReplacementPartsApiService, ReplacementPart } from '@shared/services/api/replacement-parts-api.service';

@Injectable({
  providedIn: 'root',
})
export class OperationService {
  private readonly operationsApi = inject(OperationsApiService);
  private readonly operationInstancesApi = inject(OperationInstancesApiService);
  private readonly replacementPartsApi = inject(ReplacementPartsApiService);

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

  fetchData(): Observable<{ operations: Operation[]; vehicleOperations: VehicleOperation[] }> {
    return this.operationInstancesApi.getWorkflowData();
  }

  getVehicleOperationsByVehicleId(
    vehicleOperations: VehicleOperation[],
    vehicleIdOrInstanceId: string,
  ): VehicleOperation[] {
    if (!vehicleIdOrInstanceId) return [];
    return vehicleOperations.filter(
      (vo) =>
        vo.vehicleId === vehicleIdOrInstanceId ||
        vo.vehicleInstanceId === vehicleIdOrInstanceId,
    );
  }

  /** Creates an OperationInstance in the backend and returns the raw API response. */
  addVehicleOperationFromMaster(
    vehicleInstanceId: string,
    master: {
      id: string;
      shortName: string;
      description?: string;
      defaultDuration: number;
      defaultRatePerHour: number;
    },
  ): Observable<any> {
    return this.operationInstancesApi.create({
      vehicleInstanceId,
      operationId: master.id,
      status: 'pending',
      timeAllowed: master.defaultDuration,
      ratePerHour: master.defaultRatePerHour,
    });
  }

  /** Deletes an OperationInstance from the backend by its ID. */
  removeVehicleOperation(operationInstanceId: string): Observable<unknown> {
    return this.operationInstancesApi.deleteOne(operationInstanceId);
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
    const payload: Record<string, unknown> = {
      status: updates.status,
      assignedUser: updates.assignedUserId,
      scheduledDate: updates.scheduledDate,
      scheduledTime: updates.scheduledTime,
      timeAllowed: updates.timeAllowed,
      ratePerHour: updates.ratePerHour,
      vat: updates.vat,
      labourCode: updates.labourCode,
      labourDescription: updates.labourDescription,
    };
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

    return this.operationInstancesApi.update(id, payload).pipe(
      map(() => ({
        id,
        vehicleId: '',
        vehicleInstanceId: '',
        operationId: '',
        operation: { id: '', code: '', name: '', category: 'other' as const, estimatedDuration: 0, defaultPrice: 0 },
        status: 'pending' as OperationStatus,
        ...updates,
      })),
    );
  }

  // --- Replacement Parts ---

  getReplacementParts(operationInstanceId: string): Observable<ReplacementPart[]> {
    return this.replacementPartsApi.findByOperationInstance(operationInstanceId);
  }

  createReplacementPart(data: Omit<ReplacementPart, '_id'>): Observable<ReplacementPart> {
    return this.replacementPartsApi.create(data) as Observable<ReplacementPart>;
  }

  updateReplacementPart(id: string, data: Partial<ReplacementPart>): Observable<ReplacementPart> {
    return this.replacementPartsApi.update(id, data) as Observable<ReplacementPart>;
  }

  deleteReplacementPart(id: string): Observable<unknown> {
    return this.replacementPartsApi.deleteOne(id);
  }

  bulkMarkInvoiced(ids: string[]): Observable<unknown> {
    if (!ids.length) return of(null);
    return forkJoin(ids.map((id) => this.operationInstancesApi.update(id, { status: 'invoiced' })));
  }
}
