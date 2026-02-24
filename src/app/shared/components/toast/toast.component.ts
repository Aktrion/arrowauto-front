import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationType, Toast } from '@core/models/toast.model';
import { ToastService } from '@core/services/toast.service';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '@shared/icons';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (toastService.toasts().length) {
      <div class="toast toast-top toast-end z-[9999] p-4 gap-3 pointer-events-none">
        @for (toast of toastService.toasts(); track toast.id) {
          <div
            class="alert glass-toast border-0 shadow-2xl relative overflow-hidden min-w-[320px] max-w-md p-0 flex flex-col items-stretch animate-slide-up pointer-events-auto"
          >
            <!-- Progress Bar -->
            <div class="absolute bottom-0 left-0 h-1.5 bg-white/10 w-full z-10">
              <div
                class="h-full bg-white/30 progress-bar-fill"
                [style.animation-duration.ms]="toast.durationMs"
              ></div>
            </div>

            <div class="flex items-start gap-4 p-4" [class]="alertBgClass(toast.type)">
              <div class="flex-shrink-0 mt-0.5">
                <div class="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                  <lucide-icon
                    [name]="iconFor(toast.type)"
                    class="h-6 w-6 text-white"
                  ></lucide-icon>
                </div>
              </div>

              <div class="flex-1 flex flex-col gap-1 pr-6">
                @if (toast.title) {
                  <h4 class="font-bold text-white text-lg leading-tight">{{ toast.title }}</h4>
                }
                <p class="text-white/95 text-sm font-medium whitespace-pre-line">
                  {{ toast.message }}
                </p>

                @if (toast.action) {
                  <button
                    class="mt-3 btn btn-xs border-white/20 bg-white/10 hover:bg-white/20 text-white font-bold w-fit uppercase tracking-wider"
                    (click)="handleAction(toast)"
                  >
                    {{ toast.action.label }}
                  </button>
                }
              </div>

              <button
                class="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
                (click)="toastService.dismiss(toast.id)"
              >
                <lucide-icon [name]="icons.X" class="h-4 w-4"></lucide-icon>
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .glass-toast {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    .progress-bar-fill {
      animation: progress-width linear forwards;
    }

    @keyframes progress-width {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    .bg-toast-success {
      background: var(--gradient-success);
    }
    .bg-toast-error {
      background: var(--gradient-error);
    }
    .bg-toast-warning {
      background: var(--gradient-warning);
    }
    .bg-toast-info {
      background: var(--gradient-info);
    }

    .animate-slide-up {
      animation: toast-slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    @keyframes toast-slide-up {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `,
})
export class ToastComponent {
  icons = ICONS;
  toastService = inject(ToastService);

  alertBgClass(type: NotificationType): string {
    const classes: Record<NotificationType, string> = {
      success: 'bg-toast-success',
      error: 'bg-toast-error',
      warning: 'bg-toast-warning',
      info: 'bg-toast-info',
    };
    return classes[type];
  }

  iconFor(type: NotificationType) {
    const icons: Record<NotificationType, any> = {
      success: this.icons.CircleCheckBig,
      error: this.icons.CircleAlert,
      warning: this.icons.TriangleAlert,
      info: this.icons.Info,
    };
    return icons[type];
  }

  handleAction(toast: Toast) {
    if (toast.action) {
      toast.action.callback();
      this.toastService.dismiss(toast.id);
    }
  }
}
