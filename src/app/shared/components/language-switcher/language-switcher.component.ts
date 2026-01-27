import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../icons';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="dropdown dropdown-end">
      <div
        tabindex="0"
        role="button"
        class="btn btn-ghost btn-circle btn-sm rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all shadow-lg flex items-center justify-center overflow-hidden"
      >
        <span class="text-[10px] font-bold text-white uppercase">{{ currentLang() }}</span>
        <img
          [src]="currentLang() === 'en' ? '/assets/flags/gb.svg' : '/assets/flags/es.svg'"
          [alt]="currentLang()"
          class="absolute inset-0 w-full h-full object-cover rounded-full z-10 hover:opacity-75"
          onerror="this.style.visibility='hidden'"
        />
      </div>
      <ul
        tabindex="0"
        class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-40 border border-base-200"
      >
        <li>
          <button
            (click)="switchLang('en')"
            [class.active]="currentLang() === 'en'"
            class="flex items-center gap-3"
          >
            <div
              class="w-5 h-5 rounded-full overflow-hidden border border-base-content/10 bg-base-200 flex items-center justify-center relative"
            >
              <img
                src="/assets/flags/gb.svg"
                alt="English"
                class="absolute inset-0 w-full h-full object-cover z-10"
                onerror="this.style.display='none'"
              />
              <span class="text-[8px] font-bold">🇬🇧</span>
            </div>
            English
          </button>
        </li>
        <li>
          <button
            (click)="switchLang('es')"
            [class.active]="currentLang() === 'es'"
            class="flex items-center gap-3"
          >
            <div
              class="w-5 h-5 rounded-full overflow-hidden border border-base-content/10 bg-base-200 flex items-center justify-center relative"
            >
              <img
                src="/assets/flags/es.svg"
                alt="Español"
                class="absolute inset-0 w-full h-full object-cover z-10"
                onerror="this.style.display='none'"
              />
              <span class="text-[8px] font-bold">🇪🇸</span>
            </div>
            Español
          </button>
        </li>
      </ul>
    </div>
  `,
  styles: [
    `
      .dropdown-content {
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class LanguageSwitcherComponent {
  icons = ICONS;
  private translate = inject(TranslateService);

  currentLang = signal(this.translate.currentLang || 'en');

  switchLang(lang: string) {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem('language', lang);
  }

  constructor() {
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      this.translate.use(savedLang);
      this.currentLang.set(savedLang);
    }
  }
}
