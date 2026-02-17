import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationToast {
  id: string;
  type: NotificationType;
  message: string;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  toasts = signal<NotificationToast[]>([]);

  success(message: string, durationMs = 3200) {
    this.push('success', message, durationMs);
  }

  error(message: string, durationMs = 4200) {
    this.push('error', message, durationMs);
  }

  warning(message: string, durationMs = 3600) {
    this.push('warning', message, durationMs);
  }

  info(message: string, durationMs = 3200) {
    this.push('info', message, durationMs);
  }

  dismiss(id: string) {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  private push(type: NotificationType, message: string, durationMs: number) {
    const toast: NotificationToast = {
      id: crypto.randomUUID(),
      type,
      message,
      durationMs,
    };

    this.toasts.update((current) => [...current, toast]);
    window.setTimeout(() => this.dismiss(toast.id), durationMs);
  }
}
