import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationType } from '../../../core/services/notification.service';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { ICONS } from '../../icons';

@Component({
  selector: 'app-toast-stack',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (notificationService.toasts().length) {
      <div class="toast toast-top toast-end z-[1000]">
        @for (toast of notificationService.toasts(); track toast.id) {
          <div class="alert border-none text-white shadow-lg" [class]="alertClass(toast.type)">
            <lucide-icon [name]="iconFor(toast.type)" class="h-5 w-5 shrink-0"></lucide-icon>
            <span class="font-medium">{{ toast.message }}</span>
            <button class="btn btn-ghost btn-xs text-white/90" (click)="notificationService.dismiss(toast.id)">
              <lucide-icon [name]="icons.X" class="h-4 w-4"></lucide-icon>
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class ToastStackComponent {
  icons = ICONS;
  notificationService = inject(NotificationService);

  alertClass(type: NotificationType): string {
    const classes: Record<NotificationType, string> = {
      success: 'alert-success',
      error: 'alert-error',
      warning: 'alert-warning',
      info: 'alert-info',
    };
    return classes[type];
  }

  iconFor(type: NotificationType) {
    const icons: Record<NotificationType, LucideIconData> = {
      success: this.icons.CircleCheckBig,
      error: this.icons.CircleAlert,
      warning: this.icons.TriangleAlert,
      info: this.icons.Info,
    };
    return icons[type];
  }
}
