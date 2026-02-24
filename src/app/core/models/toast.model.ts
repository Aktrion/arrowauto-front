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
