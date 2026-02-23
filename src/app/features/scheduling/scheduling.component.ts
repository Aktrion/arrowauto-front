import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { VehicleService } from '../vehicles/services/vehicle.service';
import { OperationService } from '../../shared/services/service.service';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons';

interface DaySlot {
  date: Date;
  dayName: string;
  dayNumber: number;
  totalHours: number;
  scheduledHours: number;
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './scheduling.component.html',
})
export class SchedulingComponent {
  icons = ICONS;
  private userService = inject(UserService);
  private vehicleService = inject(VehicleService);
  private operationService = inject(OperationService);

  operators = this.userService.operatorsByRole;
  currentWeekStart = signal(this.getWeekStart(new Date()));
  selectedDay = signal(new Date());
  selectedOperatorId = signal<string | null>(null);
  selectedSlotTime = signal<string>('');
  selectedPendingOperationId = signal<string>('');

  weekDays = computed((): DaySlot[] => {
    const days: DaySlot[] = [];
    const start = this.currentWeekStart();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pendingCount = this.pendingOperations().length;

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const totalHours = 8 * this.operators().length;
      const scheduledHours = Math.min(totalHours, Math.ceil((pendingCount / 7) * 0.75) + (i % 2));
      days.push({
        date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        totalHours,
        scheduledHours,
      });
    }
    return days;
  });

  timeSlots = computed((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
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
    const vehicles = this.vehicleService.vehicles();
    const vehicleOps = this.operationService.vehicleOperations();

    return vehicleOps
      .filter((vo) => vo.status === 'pending')
      .map((vo) => ({
        ...vo,
        vehiclePlate:
          vehicles.find((v) => v._id === vo.vehicleId)?.vehicle?.licensePlate || 'Unknown',
      }));
  });

  scheduledOperations = computed(() => {
    const selectedDay = this.selectedDay().toDateString();
    return this.operationService
      .vehicleOperations()
      .filter((op) => op.status !== 'pending' && !!op.assignedUserId && !!op.scheduledTime)
      .filter((op) =>
        op.scheduledDate ? new Date(op.scheduledDate).toDateString() === selectedDay : true,
      );
  });

  selectedOperatorName = computed(() => {
    const opId = this.selectedOperatorId();
    if (!opId) return '';
    return this.operators().find((o) => o.id === opId)?.name || '';
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
    return day ? day.totalHours - day.scheduledHours : 0;
  }

  getSlotTask(
    operatorId: string,
    time: string,
  ): { code: string; name: string; status: string } | null {
    const op = this.scheduledOperations().find(
      (item) => item.assignedUserId === operatorId && item.scheduledTime === time,
    );
    if (!op) return null;

    return {
      code: op.operation?.code || 'OPR',
      name: op.operation?.name || 'Operation',
      status: op.status,
    };
  }

  openSlotModal(operatorId: string, time: string): void {
    this.selectedOperatorId.set(operatorId);
    this.selectedSlotTime.set(time);
    this.selectedPendingOperationId.set('');
    (document.getElementById('assign_modal') as HTMLDialogElement)?.showModal();
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
      .subscribe(() => {
        this.selectedPendingOperationId.set('');
        (document.getElementById('assign_modal') as HTMLDialogElement)?.close();
      });
  }
}
