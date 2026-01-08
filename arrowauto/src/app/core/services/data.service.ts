import { Injectable, signal, computed } from '@angular/core';
import {
  Vehicle,
  Client,
  Operation,
  VehicleOperation,
  User,
  InspectionPoint,
  InspectionResult,
  Inspection,
  DashboardStats,
  VehicleStatus,
  OperationStatus,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  // Mock data signals
  private _vehicles = signal<Vehicle[]>(this.generateMockVehicles());
  private _clients = signal<Client[]>(this.generateMockClients());
  private _operations = signal<Operation[]>(this.generateMockOperations());
  private _vehicleOperations = signal<VehicleOperation[]>(this.generateMockVehicleOperations());
  private _users = signal<User[]>(this.generateMockUsers());
  private _inspectionPoints = signal<InspectionPoint[]>(this.generateMockInspectionPoints());
  private _inspections = signal<Inspection[]>([]);

  // Public readonly signals
  readonly vehicles = this._vehicles.asReadonly();
  readonly clients = this._clients.asReadonly();
  readonly operations = this._operations.asReadonly();
  readonly vehicleOperations = this._vehicleOperations.asReadonly();
  readonly users = this._users.asReadonly();
  readonly operatorsByRole = computed(() => this._users().filter((u) => u.role === 'operator'));
  readonly inspectionPoints = this._inspectionPoints.asReadonly();
  readonly inspections = this._inspections.asReadonly();

  // Computed stats
  readonly dashboardStats = computed<DashboardStats>(() => {
    const vehicles = this._vehicles();
    const today = new Date().toDateString();

    return {
      activeVehicles: vehicles.filter((v) => v.status !== 'completed' && v.status !== 'invoiced')
        .length,
      pendingInspections: vehicles.filter((v) => v.status === 'inspection').length,
      awaitingApproval: vehicles.filter((v) => v.status === 'awaiting_approval').length,
      completedToday: vehicles.filter(
        (v) => v.status === 'completed' && v.updatedAt.toDateString() === today
      ).length,
      totalRevenue: 45780.5,
      operatorsAvailable: this._users().filter((u) => u.role === 'operator').length,
    };
  });

  // Vehicle methods
  getVehicleById(id: string): Vehicle | undefined {
    return this._vehicles().find((v) => v.id === id);
  }

  getVehicleByPlate(plate: string): Vehicle | undefined {
    return this._vehicles().find((v) => v.plate.toLowerCase() === plate.toLowerCase());
  }

  addVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'jobNumber'>): Vehicle {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: crypto.randomUUID(),
      jobNumber: this.generateJobNumber(),
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

  // Client methods
  getClientById(id: string): Client | undefined {
    return this._clients().find((c) => c.id === id);
  }

  searchClients(query: string): Client[] {
    const lowerQuery = query.toLowerCase();
    return this._clients().filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) || c.company?.toLowerCase().includes(lowerQuery)
    );
  }

  addClient(client: Omit<Client, 'id'>): Client {
    const newClient: Client = {
      ...client,
      id: crypto.randomUUID(),
    };
    this._clients.update((clients) => [...clients, newClient]);
    return newClient;
  }

  // Operation methods
  getOperationById(id: string): Operation | undefined {
    return this._operations().find((o) => o.id === id);
  }

  searchOperations(query: string): Operation[] {
    const lowerQuery = query.toLowerCase();
    return this._operations().filter(
      (o) => o.code.toLowerCase().includes(lowerQuery) || o.name.toLowerCase().includes(lowerQuery)
    );
  }

  // Vehicle Operation methods
  getVehicleOperations(vehicleId: string): VehicleOperation[] {
    return this._vehicleOperations().filter((vo) => vo.vehicleId === vehicleId);
  }

  addVehicleOperation(vehicleId: string, operationId: string): VehicleOperation {
    const operation = this.getOperationById(operationId);
    const newVO: VehicleOperation = {
      id: crypto.randomUUID(),
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

  // User methods
  getOperators(): User[] {
    return this.operatorsByRole();
  }

  // Helper methods
  private generateJobNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `JOB-${year}${month}-${random}`;
  }

  // Mock data generators
  private generateMockClients(): Client[] {
    return [
      {
        id: '1',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+44 7700 900123',
        company: 'ABC Motors',
        type: 'company',
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '+44 7700 900456',
        company: 'XYZ Leasing',
        type: 'company',
      },
      {
        id: '3',
        name: 'Mike Williams',
        email: 'mike@example.com',
        phone: '+44 7700 900789',
        company: 'Fleet Solutions Ltd',
        type: 'company',
      },
      {
        id: '4',
        name: 'Emma Brown',
        email: 'emma@example.com',
        phone: '+44 7700 900321',
        type: 'individual',
      },
      {
        id: '5',
        name: 'James Wilson',
        email: 'james@example.com',
        phone: '+44 7700 900654',
        company: 'CarCare Services',
        type: 'company',
      },
    ];
  }

  private generateMockVehicles(): Vehicle[] {
    const statuses: VehicleStatus[] = [
      'pending',
      'in_progress',
      'inspection',
      'awaiting_approval',
      'completed',
    ];
    return [
      {
        id: '1',
        plate: 'AB12 CDE',
        make: 'BMW',
        model: '320d',
        year: 2022,
        color: 'Black',
        mileage: 45000,
        clientId: '1',
        status: 'inspection',
        jobNumber: 'JOB-2501-0001',
        createdAt: new Date('2025-01-06'),
        updatedAt: new Date(),
      },
      {
        id: '2',
        plate: 'XY34 FGH',
        make: 'Audi',
        model: 'A4',
        year: 2021,
        color: 'White',
        mileage: 32000,
        clientId: '2',
        status: 'in_progress',
        jobNumber: 'JOB-2501-0002',
        createdAt: new Date('2025-01-07'),
        updatedAt: new Date(),
      },
      {
        id: '3',
        plate: 'CD56 IJK',
        make: 'Mercedes',
        model: 'C-Class',
        year: 2023,
        color: 'Silver',
        mileage: 18000,
        clientId: '3',
        status: 'awaiting_approval',
        jobNumber: 'JOB-2501-0003',
        createdAt: new Date('2025-01-07'),
        updatedAt: new Date(),
      },
      {
        id: '4',
        plate: 'EF78 LMN',
        make: 'Volkswagen',
        model: 'Golf',
        year: 2020,
        color: 'Blue',
        mileage: 67000,
        clientId: '1',
        status: 'pending',
        jobNumber: 'JOB-2501-0004',
        createdAt: new Date('2025-01-08'),
        updatedAt: new Date(),
      },
      {
        id: '5',
        plate: 'GH90 OPQ',
        make: 'Ford',
        model: 'Focus',
        year: 2022,
        color: 'Red',
        mileage: 28000,
        clientId: '4',
        status: 'completed',
        jobNumber: 'JOB-2501-0005',
        createdAt: new Date('2025-01-05'),
        updatedAt: new Date(),
      },
      {
        id: '6',
        plate: 'IJ12 RST',
        make: 'Toyota',
        model: 'Corolla',
        year: 2021,
        color: 'Grey',
        mileage: 42000,
        clientId: '5',
        status: 'inspection',
        jobNumber: 'JOB-2501-0006',
        createdAt: new Date('2025-01-08'),
        updatedAt: new Date(),
      },
    ];
  }

  private generateMockOperations(): Operation[] {
    return [
      {
        id: '1',
        code: 'LTI',
        name: 'Light Tunnel Inspection',
        description: 'Full vehicle light inspection in tunnel',
        estimatedDuration: 30,
        defaultPrice: 45.0,
        category: 'inspection',
      },
      {
        id: '2',
        code: 'VHC',
        name: 'Vehicle Health Check',
        description: 'Complete vehicle health inspection',
        estimatedDuration: 45,
        defaultPrice: 75.0,
        category: 'inspection',
      },
      {
        id: '3',
        code: 'EXT',
        name: 'Exterior Cleaning',
        description: 'Full exterior wash and polish',
        estimatedDuration: 60,
        defaultPrice: 35.0,
        category: 'cleaning',
      },
      {
        id: '4',
        code: 'INT',
        name: 'Interior Cleaning',
        description: 'Deep interior cleaning',
        estimatedDuration: 45,
        defaultPrice: 40.0,
        category: 'cleaning',
      },
      {
        id: '5',
        code: 'TAG',
        name: 'Remove Tags/Stickers',
        description: 'Remove all dealer tags and stickers',
        estimatedDuration: 15,
        defaultPrice: 15.0,
        category: 'other',
      },
      {
        id: '6',
        code: 'TYR',
        name: 'Tyre Inspection',
        description: 'Check tyre condition and pressure',
        estimatedDuration: 20,
        defaultPrice: 20.0,
        category: 'inspection',
      },
      {
        id: '7',
        code: 'PDI',
        name: 'Pre-Delivery Inspection',
        description: 'Full pre-delivery check',
        estimatedDuration: 90,
        defaultPrice: 120.0,
        category: 'inspection',
      },
    ];
  }

  private generateMockVehicleOperations(): VehicleOperation[] {
    return [
      {
        id: '1',
        vehicleId: '1',
        operationId: '1',
        status: 'completed',
        scheduledDate: new Date(),
        scheduledTime: '09:00',
        assignedUserId: '2',
      },
      {
        id: '2',
        vehicleId: '1',
        operationId: '2',
        status: 'in_progress',
        scheduledDate: new Date(),
        scheduledTime: '09:30',
        assignedUserId: '2',
      },
      {
        id: '3',
        vehicleId: '2',
        operationId: '3',
        status: 'scheduled',
        scheduledDate: new Date(),
        scheduledTime: '10:00',
        assignedUserId: '3',
      },
      { id: '4', vehicleId: '2', operationId: '4', status: 'pending' },
      {
        id: '5',
        vehicleId: '3',
        operationId: '2',
        status: 'completed',
        scheduledDate: new Date(),
        scheduledTime: '08:00',
        assignedUserId: '2',
      },
    ];
  }

  private generateMockUsers(): User[] {
    return [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@arrowauto.com',
        role: 'admin',
        roles: ['admin'],
        status: 'online',
        avatar: '',
      },
      {
        id: '2',
        name: 'Dave Lee',
        email: 'dave@arrowauto.com',
        role: 'operator',
        roles: ['operator'],
        status: 'online',
        avatar: '',
      },
      {
        id: '3',
        name: 'Tom Harris',
        email: 'tom@arrowauto.com',
        role: 'operator',
        roles: ['operator'],
        status: 'online',
        avatar: '',
      },
      {
        id: '4',
        name: 'Lisa Chen',
        email: 'lisa@arrowauto.com',
        role: 'operator',
        roles: ['operator'],
        status: 'online',
        avatar: '',
      },
      {
        id: '5',
        name: 'Mark Taylor',
        email: 'mark@arrowauto.com',
        role: 'supervisor',
        roles: ['supervisor', 'operator'],
        status: 'busy',
        avatar: '',
      },
    ];
  }

  private generateMockInspectionPoints(): InspectionPoint[] {
    return [
      {
        id: '1',
        code: 'FB',
        category: 'Exterior',
        name: 'Front Bumper',
        predefinedComments: ['Scratched', 'Dented', 'Cracked', 'Paint damage', 'Missing'],
      },
      {
        id: '2',
        code: 'RB',
        category: 'Exterior',
        name: 'Rear Bumper',
        predefinedComments: ['Scratched', 'Dented', 'Cracked', 'Paint damage', 'Missing'],
      },
      {
        id: '3',
        code: 'BN',
        category: 'Exterior',
        name: 'Bonnet',
        predefinedComments: ['Scratched', 'Dented', 'Paint damage', 'Stone chips'],
      },
      {
        id: '4',
        code: 'RF',
        category: 'Exterior',
        name: 'Roof',
        predefinedComments: ['Scratched', 'Dented', 'Paint damage', 'Hail damage'],
      },
      {
        id: '5',
        code: 'DD',
        category: 'Exterior',
        name: 'Driver Door',
        predefinedComments: ['Scratched', 'Dented', 'Paint damage', 'Handle damage'],
      },
      {
        id: '6',
        code: 'PD',
        category: 'Exterior',
        name: 'Passenger Door',
        predefinedComments: ['Scratched', 'Dented', 'Paint damage', 'Handle damage'],
      },
      {
        id: '7',
        code: 'FLW',
        category: 'Wheels',
        name: 'Front Left Wheel',
        predefinedComments: ['Kerb damage', 'Corrosion', 'Buckled', 'Missing centre cap'],
      },
      {
        id: '8',
        code: 'FRW',
        category: 'Wheels',
        name: 'Front Right Wheel',
        predefinedComments: ['Kerb damage', 'Corrosion', 'Buckled', 'Missing centre cap'],
      },
      {
        id: '9',
        code: 'RLW',
        category: 'Wheels',
        name: 'Rear Left Wheel',
        predefinedComments: ['Kerb damage', 'Corrosion', 'Buckled', 'Missing centre cap'],
      },
      {
        id: '10',
        code: 'RRW',
        category: 'Wheels',
        name: 'Rear Right Wheel',
        predefinedComments: ['Kerb damage', 'Corrosion', 'Buckled', 'Missing centre cap'],
      },
      {
        id: '11',
        code: 'FLT',
        category: 'Tyres',
        name: 'Front Left Tyre',
        predefinedComments: ['Low tread', 'Puncture', 'Side wall damage', 'Uneven wear'],
      },
      {
        id: '12',
        code: 'FRT',
        category: 'Tyres',
        name: 'Front Right Tyre',
        predefinedComments: ['Low tread', 'Puncture', 'Side wall damage', 'Uneven wear'],
      },
      {
        id: '13',
        code: 'RLT',
        category: 'Tyres',
        name: 'Rear Left Tyre',
        predefinedComments: ['Low tread', 'Puncture', 'Side wall damage', 'Uneven wear'],
      },
      {
        id: '14',
        code: 'RRT',
        category: 'Tyres',
        name: 'Rear Right Tyre',
        predefinedComments: ['Low tread', 'Puncture', 'Side wall damage', 'Uneven wear'],
      },
      {
        id: '15',
        code: 'DS',
        category: 'Interior',
        name: 'Driver Seat',
        predefinedComments: ['Stained', 'Torn', 'Worn', 'Burns'],
      },
      {
        id: '16',
        code: 'PS',
        category: 'Interior',
        name: 'Passenger Seat',
        predefinedComments: ['Stained', 'Torn', 'Worn', 'Burns'],
      },
      {
        id: '17',
        code: 'DB',
        category: 'Interior',
        name: 'Dashboard',
        predefinedComments: ['Scratched', 'Cracked', 'Faded', 'Warning lights on'],
      },
      {
        id: '18',
        code: 'SW',
        category: 'Interior',
        name: 'Steering Wheel',
        predefinedComments: ['Worn', 'Damaged', 'Leather peeling'],
      },
      {
        id: '19',
        code: 'WS',
        category: 'Glass',
        name: 'Windscreen',
        predefinedComments: ['Chipped', 'Cracked', 'Stone damage'],
      },
      {
        id: '20',
        code: 'RW',
        category: 'Glass',
        name: 'Rear Window',
        predefinedComments: ['Chipped', 'Cracked', 'Defroster not working'],
      },
    ];
  }
}
