import { Injectable, signal } from '@angular/core';
import { Product, Vehicle } from '../models/vehicle.model';
import {
  generateMockVehicles,
  generateMockVehiclesProducts,
} from '../../../shared/utils/mock-data';
import { generateId, generateJobNumber } from '../../../shared/utils/id-generator';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private _vehicles = signal<Product[]>(generateMockVehiclesProducts());
  readonly vehicles = this._vehicles.asReadonly();

  getVehicleById(id: string): Product | undefined {
    return this._vehicles().find((v) => v.id === id);
  }

  getVehicleByPlate(plate: string): Product | undefined {
    return this._vehicles().find(
      (v) => v.vehicle?.licensePlate.toLowerCase() === plate.toLowerCase()
    );
  }

  addVehicleProduct(
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'jobNumber' | 'status'>
  ): Product {
    const newProduct: Product = {
      ...product,
      id: generateId(),
      status: 'pending',
    };
    this._vehicles.update((vehicles) => [...vehicles, newProduct]);
    return newProduct;
  }

  updateVehicleProduct(id: string, updates: Partial<Product>): void {
    this._vehicles.update((vehicles) =>
      vehicles.map((v) => (v.id === id ? { ...v, ...updates, updatedAt: new Date() } : v))
    );
  }
}
