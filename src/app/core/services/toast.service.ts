import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  durationMs: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  success(message: string, durationMs = 1200) {
    this.push('success', message, undefined, durationMs);
  }

  error(message: string, durationMs = 2200) {
    this.push('error', message, undefined, durationMs);
  }

  warning(message: string, durationMs = 2600) {
    this.push('warning', message, undefined, durationMs);
  }

  info(message: string, durationMs = 2200) {
    this.push('info', message, undefined, durationMs);
  }

  /**
   * Show a notification with custom options
   */
  show(options: {
    type: NotificationType;
    title?: string;
    message: string;
    durationMs?: number;
    action?: { label: string; callback: () => void };
  }) {
    this.push(
      options.type,
      options.message,
      options.title,
      options.durationMs ?? 3200,
      options.action,
    );
  }

  dismiss(id: string) {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  private push(
    type: NotificationType,
    message: string,
    title?: string,
    durationMs: number = 3200,
    action?: { label: string; callback: () => void },
  ) {
    const toast: Toast = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      durationMs,
      action,
    };

    this.toasts.update((current) => [...current, toast]);
    window.setTimeout(() => this.dismiss(toast.id), durationMs);
  }
}
