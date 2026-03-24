import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { UserService } from '@core/services/user.service';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { OperationService } from '@shared/services/operation.service';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { VehicleInstance } from '@features/vehicles/models/vehicle.model';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';

interface DaySlot {
  date: Date;
  dayName: string;
  dayNumber: number;
  totalHours: number;
  scheduledHours: number;
  scheduledCount: number;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

interface SlotTask {
  id: string;
  code: string;
  name: string;
  status: string;
  vehiclePlate: string;
  duration: number;
}

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SelectComponent, TranslateModule],
  templateUrl: './scheduling.component.html',
})
export class SchedulingComponent implements OnInit {
  icons = ICONS;
  private userService = inject(UserService);
  private instanceApi = inject(VehicleInstancesApiService);
  private operationService = inject(OperationService);

  vehicles = signal<VehicleInstance[]>([]);
  vehicleOperations = signal<any[]>([]);
  users = signal<any[]>([]);
  operators = computed(() => this.userService.getOperators(this.users()));

  currentWeekStart = signal(this.getWeekStart(new Date()));
  selectedDay = signal(new Date());
  selectedOperatorId = signal<string | null>(null);
  selectedSlotTime = signal<string>('');
  selectedPendingOperationId = signal<string>('');
  showAssignModal = signal(false);
  showEditModal = signal(false);
  editingOperation = signal<SlotTask | null>(null);
  editForm = signal({ operatorId: '', time: '', status: '' });

  ngOnInit(): void {
    this.refreshData();
    this.userService.fetchUsers().subscribe((u) => this.users.set(u));
  }

  private refreshData(): void {
    forkJoin({
      vehicles: this.instanceApi.findByPagination({
        page: 1,
        limit: 500,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      opsData: this.operationService.fetchData(),
    }).subscribe(({ vehicles, opsData }) => {
      this.vehicles.set(vehicles.data ?? []);
      this.vehicleOperations.set(opsData.vehicleOperations);
    });
  }

  private instanceById = computed(() => {
    const map = new Map<string, any>();
    this.vehicles().forEach((v: any) => {
      const id = v._id || v.id;
      if (id) map.set(String(id), v);
    });
    return map;
  });

  weekDays = computed((): DaySlot[] => {
    const days: DaySlot[] = [];
    const start = this.currentWeekStart();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const allOps = this.vehicleOperations();

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = date.toDateString();
      const totalHours = 8 * Math.max(1, this.operators().length);
      const scheduledForDay = allOps.filter(
        (op) =>
          (op.status === 'scheduled' || op.status === 'in_progress') &&
          op.scheduledDate &&
          new Date(op.scheduledDate).toDateString() === dateStr,
      );
      const scheduledHours = scheduledForDay.reduce(
        (sum, op) => sum + (op.operation?.estimatedDuration || 60) / 60,
        0,
      );
      days.push({
        date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        totalHours,
        scheduledHours: Math.round(scheduledHours * 10) / 10,
        scheduledCount: scheduledForDay.length,
      });
    }
    return days;
  });

  /** Only show hourly slots (not 15-min) to keep the grid manageable */
  timeSlots = computed((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          hour,
          minute,
        });
      }
    }
    return slots;
  });

  pendingOperations = computed(() => {
    const instanceMap = this.instanceById();
    return this.vehicleOperations()
      .filter((vo) => vo.status === 'pending')
      .map((vo) => {
        const instance = instanceMap.get(String(vo.vehicleInstanceId || ''));
        const plate = instance?.vehicle?.licensePlate || '';
        const vehicleName = instance?.vehicle
          ? `${instance.vehicle.make || ''} ${instance.vehicle.model || ''}`.trim()
          : '';
        return { ...vo, vehiclePlate: plate, vehicleName };
      });
  });

  pendingOperationSelectOptions = computed<SelectOption[]>(() =>
    this.pendingOperations().map((op: any) => ({
      label: `${op.vehiclePlate || 'N/A'} - ${op.operation?.name || 'Operation'} (${op.operation?.estimatedDuration || '?'}min)`,
      value: op.id,
    })),
  );

  operatorSelectOptions = computed<SelectOption[]>(() =>
    this.operators().map((op: any) => ({
      label: op.name,
      value: op.id,
    })),
  );

  scheduledOperations = computed(() => {
    const selectedDay = this.selectedDay().toDateString();
    return this.vehicleOperations()
      .filter((op) => op.status === 'scheduled' || op.status === 'in_progress')
      .filter((op) => !!op.assignedUserId && !!op.scheduledTime)
      .filter((op) =>
        op.scheduledDate ? new Date(op.scheduledDate).toDateString() === selectedDay : false,
      );
  });

  selectedOperatorName = computed(() => {
    const opId = this.selectedOperatorId();
    if (!opId) return '';
    return this.operators().find((o) => o.id === opId)?.name || '';
  });

  todayScheduledCount = computed(() => {
    const today = new Date().toDateString();
    return this.vehicleOperations().filter(
      (op) =>
        (op.status === 'scheduled' || op.status === 'in_progress') &&
        op.scheduledDate &&
        new Date(op.scheduledDate).toDateString() === today,
    ).length;
  });

  todayCompletedCount = computed(() => {
    const today = new Date().toDateString();
    return this.vehicleOperations().filter(
      (op) =>
        op.status === 'completed' &&
        op.scheduledDate &&
        new Date(op.scheduledDate).toDateString() === today,
    ).length;
  });

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  formatWeekRange(): string {
    const start = this.currentWeekStart();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startMonth = start.toLocaleDateString('en-GB', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-GB', { month: 'short' });
    if (startMonth === endMonth) {
      return `${start.getDate()} - ${end.getDate()} ${startMonth}`;
    }
    return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`;
  }

  previousWeek(): void {
    const newStart = new Date(this.currentWeekStart());
    newStart.setDate(newStart.getDate() - 7);
    this.currentWeekStart.set(newStart);
  }

  nextWeek(): void {
    const newStart = new Date(this.currentWeekStart());
    newStart.setDate(newStart.getDate() + 7);
    this.currentWeekStart.set(newStart);
  }

  goToToday(): void {
    this.currentWeekStart.set(this.getWeekStart(new Date()));
    this.selectedDay.set(new Date());
  }

  selectDay(date: Date): void {
    this.selectedDay.set(date);
  }

  isSelectedDay(date: Date): boolean {
    return date.toDateString() === this.selectedDay().toDateString();
  }

  isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvailableHours(): number {
    const day = this.weekDays().find(
      (d) => d.date.toDateString() === this.selectedDay().toDateString(),
    );
    return day ? Math.max(0, Math.round((day.totalHours - day.scheduledHours) * 10) / 10) : 0;
  }

  getSlotTask(operatorId: string, time: string): SlotTask | null {
    const instanceMap = this.instanceById();
    const op = this.scheduledOperations().find(
      (item) => item.assignedUserId === operatorId && item.scheduledTime === time,
    );
    if (!op) return null;

    const instance = instanceMap.get(String(op.vehicleInstanceId || ''));
    const plate = instance?.vehicle?.licensePlate || '';

    return {
      id: op.id,
      code: op.operation?.code || 'OP',
      name: op.operation?.name || 'Operation',
      status: op.status,
      vehiclePlate: plate,
      duration: op.operation?.estimatedDuration || 60,
    };
  }

  // --- Assign Modal (empty slot click) ---

  openSlotModal(operatorId: string, time: string): void {
    this.selectedOperatorId.set(operatorId);
    this.selectedSlotTime.set(time);
    this.selectedPendingOperationId.set('');
    this.showAssignModal.set(true);
  }

  confirmAssignment(): void {
    const operatorId = this.selectedOperatorId();
    const slotTime = this.selectedSlotTime();
    const operationId = this.selectedPendingOperationId();
    if (!operatorId || !slotTime || !operationId) return;

    this.operationService
      .assignVehicleOperation(operationId, {
        assignedUserId: operatorId,
        scheduledDate: this.selectedDay(),
        scheduledTime: slotTime,
      })
      .subscribe({
        next: () => {
          this.selectedPendingOperationId.set('');
          this.showAssignModal.set(false);
          this.refreshData();
        },
      });
  }

  // --- Edit Modal (existing scheduled op click) ---

  openEditModal(task: SlotTask, operatorId: string): void {
    this.editingOperation.set(task);
    this.editForm.set({
      operatorId,
      time: this.scheduledOperations().find((o) => o.id === task.id)?.scheduledTime || '',
      status: task.status,
    });
    this.showEditModal.set(true);
  }

  saveEdit(): void {
    const op = this.editingOperation();
    const form = this.editForm();
    if (!op) return;

    this.operationService
      .updateVehicleOperation(op.id, {
        assignedUserId: form.operatorId || undefined,
        scheduledTime: form.time || undefined,
        status: form.status as any,
      })
      .subscribe({
        next: () => {
          this.showEditModal.set(false);
          this.editingOperation.set(null);
          this.refreshData();
        },
      });
  }

  unscheduleOperation(): void {
    const op = this.editingOperation();
    if (!op) return;

    this.operationService
      .updateVehicleOperation(op.id, {
        status: 'pending',
        assignedUserId: undefined,
        scheduledTime: undefined,
        scheduledDate: undefined,
      })
      .subscribe({
        next: () => {
          this.showEditModal.set(false);
          this.editingOperation.set(null);
          this.refreshData();
        },
      });
  }

  updateEditField(field: 'operatorId' | 'time' | 'status', value: string): void {
    this.editForm.set({ ...this.editForm(), [field]: value });
  }

  // --- Quick assign from pending sidebar ---

  quickAssignPending(op: any): void {
    this.selectedPendingOperationId.set(op.id);
    this.selectedOperatorId.set(null);
    this.selectedSlotTime.set('');
    this.showAssignModal.set(true);
  }
}
