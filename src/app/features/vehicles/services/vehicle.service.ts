import { Injectable, signal } from '@angular/core';
import { Vehicle } from '../models/vehicle.model';
import { generateMockVehicles } from '../../../shared/utils/mock-data';
import { generateId, generateJobNumber } from '../../../shared/utils/id-generator';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private _vehicles = signal<Vehicle[]>(generateMockVehicles());
  readonly vehicles = this._vehicles.asReadonly();

  getVehicleById(id: string): Vehicle | undefined {
    return this._vehicles().find((v) => v.id === id);
  }

  getVehicleByPlate(plate: string): Vehicle | undefined {
    return this._vehicles().find((v) => v.plate.toLowerCase() === plate.toLowerCase());
  }

  addVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'jobNumber'>): Vehicle {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: generateId(),
      jobNumber: generateJobNumber(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this._vehicles.update((vehicles) => [...vehicles, newVehicle]);
    return newVehicle;
  }

  updateVehicle(id: string, updates: Partial<Vehicle>): void {
    this._vehicles.update((vehicles) =>
      vehicles.map((v) => (v.id === id ? { ...v, ...updates, updatedAt: new Date() } : v))
    );
  }
}
