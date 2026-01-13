import { Injectable, signal } from '@angular/core';
import { Operation, VehicleOperation } from '../models';
import { generateMockOperations, generateMockVehicleOperations } from '../utils/mock-data';
import { generateId } from '../utils/id-generator';

@Injectable({
  providedIn: 'root',
})
export class OperationService {
  private _operations = signal<Operation[]>(generateMockOperations());
  private _vehicleOperations = signal<VehicleOperation[]>(generateMockVehicleOperations());

  readonly operations = this._operations.asReadonly();
  readonly vehicleOperations = this._vehicleOperations.asReadonly();

  getOperationById(id: string): Operation | undefined {
    return this._operations().find((o) => o.id === id);
  }

  searchOperations(query: string): Operation[] {
    const lowerQuery = query.toLowerCase();
    return this._operations().filter(
      (o) => o.code.toLowerCase().includes(lowerQuery) || o.name.toLowerCase().includes(lowerQuery)
    );
  }

  getVehicleOperations(vehicleId: string): VehicleOperation[] {
    return this._vehicleOperations().filter((vo) => vo.vehicleId === vehicleId);
  }

  addVehicleOperation(vehicleId: string, operationId: string): VehicleOperation {
    const operation = this.getOperationById(operationId);
    const newVO: VehicleOperation = {
      id: generateId(),
      vehicleId,
      operationId,
      operation,
      status: 'pending',
    };
    this._vehicleOperations.update((vos) => [...vos, newVO]);
    return newVO;
  }

  updateVehicleOperation(id: string, updates: Partial<VehicleOperation>): void {
    this._vehicleOperations.update((vos) =>
      vos.map((vo) => (vo.id === id ? { ...vo, ...updates } : vo))
    );
  }
}
