import { Component, computed, effect, input, signal } from '@angular/core';
import { getBrandLogoUrl } from '@shared/utils/brand-logo.utils';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  template: `
    <div
      [class]="
        'flex items-center justify-center shrink-0 overflow-hidden ' + (containerClass() || '')
      "
    >
      @if (logoUrl() && !showFallback()) {
        <img
          [src]="logoUrl()!"
          [alt]="make() || 'Brand logo'"
          [class]="'object-contain ' + (imgClass() || 'w-full h-full')"
          (error)="showFallback.set(true)"
        />
      } @else {
        <span
          [class]="
            'flex items-center justify-center font-bold text-primary-content ' +
            (fallbackClass() || 'w-full h-full')
          "
        >
          {{ (make() || '?').charAt(0).toUpperCase() }}
        </span>
      }
    </div>
  `,
})
export class BrandLogoComponent {
  /** Vehicle make (e.g. "BMW", "Alfa Romeo") */
  make = input<string | null | undefined>('');

  /** Extra classes for the container div */
  containerClass = input<string>('');

  /** Extra classes for the img element (default: w-full h-full) */
  imgClass = input<string>('');

  /** Extra classes for the fallback letter span */
  fallbackClass = input<string>('');

  showFallback = signal(false);

  logoUrl = computed(() => getBrandLogoUrl(this.make()));

  constructor() {
    effect(() => {
      this.make();
      this.showFallback.set(false);
    });
  }
}
