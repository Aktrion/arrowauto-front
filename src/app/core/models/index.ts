// Core models for ArrowAuto Vehicle Management System

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
    address?: string;
    type: 'individual' | 'company';
}

export interface Vehicle {
    id: string;
    plate: string;
    make: string;
    model: string;
    year: number;
    color: string;
    vin?: string;
    mileage?: number;
    clientId?: string;
    client?: Client;
    jobNumber?: string;
    status: VehicleStatus;
    createdAt: Date;
    updatedAt: Date;
}

export type VehicleStatus = 'pending' | 'in_progress' | 'inspection' | 'awaiting_approval' | 'approved' | 'completed' | 'invoiced';

export interface Operation {
    id: string;
    code: string;
    name: string;
    description?: string;
    estimatedDuration: number; // in minutes
    defaultPrice: number;
    category: OperationCategory;
}

export type OperationCategory = 'inspection' | 'cleaning' | 'repair' | 'maintenance' | 'other';

export interface VehicleOperation {
    id: string;
    vehicleId: string;
    operationId: string;
    operation?: Operation;
    assignedUserId?: string;
    assignedUser?: User;
    scheduledDate?: Date;
    scheduledTime?: string;
    status: OperationStatus;
    actualDuration?: number;
    actualPrice?: number;
    hourlyRate?: number;
    notes?: string;
    completedAt?: Date;
}

export type OperationStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    roles?: UserRole[];
    avatar?: string;
    status?: 'online' | 'offline' | 'busy';
}

export type UserRole = 'admin' | 'operator' | 'supervisor';

export interface InspectionPoint {
    id: string;
    code?: string;
    category: string;
    name: string;
    description?: string;
    predefinedComments: string[];
}

export interface InspectionResult {
    id: string;
    vehicleId: string;
    pointId: string;
    point?: InspectionPoint;
    status: InspectionPointStatus;
    severity?: 'minor' | 'major';
    comment?: string;
    photos: string[];
    partsCost?: number;
    laborCost?: number;
    laborHours?: number;
    hourlyRate?: number;
    requiresParts: boolean;
    customerApproved?: boolean;
}

export type InspectionPointStatus = 'ok' | 'warning' | 'defect' | 'not_inspected';

export interface Inspection {
    id: string;
    vehicleId: string;
    vehicle?: Vehicle;
    inspectorId: string;
    inspector?: User;
    results: InspectionResult[];
    status: 'in_progress' | 'completed' | 'sent_to_customer' | 'customer_approved';
    totalPartsCost: number;
    totalLaborCost: number;
    totalCost: number;
    createdAt: Date;
    completedAt?: Date;
    customerApprovedAt?: Date;
}

export interface ScheduleSlot {
    userId: string;
    user?: User;
    date: Date;
    time: string; // e.g., "09:00"
    duration: number; // in minutes (usually 15)
    vehicleOperationId?: string;
    vehicleOperation?: VehicleOperation;
}

export interface DayAvailability {
    date: Date;
    totalHours: number;
    scheduledHours: number;
    availableHours: number;
}

export interface Invoice {
    id: string;
    vehicleId: string;
    vehicle?: Vehicle;
    clientId: string;
    client?: Client;
    operations: VehicleOperation[];
    inspectionResults: InspectionResult[];
    subtotal: number;
    tax: number;
    total: number;
    status: 'draft' | 'sent' | 'paid';
    createdAt: Date;
    paidAt?: Date;
}

// Dashboard stats
export interface DashboardStats {
    activeVehicles: number;
    pendingInspections: number;
    awaitingApproval: number;
    completedToday: number;
    totalRevenue: number;
    operatorsAvailable: number;
}
