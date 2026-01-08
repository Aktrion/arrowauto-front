import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';

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
  imports: [CommonModule],
  templateUrl: './scheduling.component.html',
})
export class SchedulingComponent {
  private dataService = inject(DataService);

  operators = this.dataService.operatorsByRole;
  currentWeekStart = signal(this.getWeekStart(new Date()));
  selectedDay = signal(new Date());
  selectedOperatorId = signal<string | null>(null);
  selectedSlotTime = signal<string>('');

  weekDays = computed((): DaySlot[] => {
    const days: DaySlot[] = [];
    const start = this.currentWeekStart();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push({
        date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        totalHours: 8 * this.operators().length, // 8 hours per operator
        scheduledHours: Math.floor(Math.random() * 4 * this.operators().length), // Simulated
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
    const vehicles = this.dataService.vehicles();
    const vehicleOps = this.dataService.vehicleOperations();

    return vehicleOps
      .filter((vo) => vo.status === 'pending')
      .map((vo) => ({
        ...vo,
        vehiclePlate: vehicles.find((v) => v.id === vo.vehicleId)?.plate || 'Unknown',
      }));
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
      (d) => d.date.toDateString() === this.selectedDay().toDateString()
    );
    return day ? day.totalHours - day.scheduledHours : 0;
  }

  getSlotTask(
    operatorId: string,
    time: string
  ): { code: string; name: string; status: string } | null {
    // Simulate some scheduled tasks
    const scheduled = [
      {
        operatorId: '2',
        time: '09:00',
        code: 'LTI',
        name: 'Light Tunnel Inspection',
        status: 'completed',
      },
      {
        operatorId: '2',
        time: '09:15',
        code: 'LTI',
        name: 'Light Tunnel Inspection',
        status: 'completed',
      },
      {
        operatorId: '2',
        time: '09:30',
        code: 'VHC',
        name: 'Vehicle Health Check',
        status: 'in_progress',
      },
      {
        operatorId: '2',
        time: '09:45',
        code: 'VHC',
        name: 'Vehicle Health Check',
        status: 'in_progress',
      },
      {
        operatorId: '3',
        time: '10:00',
        code: 'EXT',
        name: 'Exterior Cleaning',
        status: 'scheduled',
      },
      {
        operatorId: '3',
        time: '10:15',
        code: 'EXT',
        name: 'Exterior Cleaning',
        status: 'scheduled',
      },
      {
        operatorId: '3',
        time: '10:30',
        code: 'EXT',
        name: 'Exterior Cleaning',
        status: 'scheduled',
      },
      {
        operatorId: '3',
        time: '10:45',
        code: 'EXT',
        name: 'Exterior Cleaning',
        status: 'scheduled',
      },
    ];

    return scheduled.find((s) => s.operatorId === operatorId && s.time === time) || null;
  }

  openSlotModal(operatorId: string, time: string): void {
    this.selectedOperatorId.set(operatorId);
    this.selectedSlotTime.set(time);
    (document.getElementById('assign_modal') as HTMLDialogElement)?.showModal();
  }
}
