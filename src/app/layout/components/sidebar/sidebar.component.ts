import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '@shared/icons';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule, LucideAngularModule],
  templateUrl: './sidebar.component.html',
  styles: [
    `
      .nav-link lucide-icon {
        display: inline-block;
        flex-shrink: 0;
      }
      .nav-link span {
        flex-shrink: 0;
      }
    `,
  ],
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() sidenavMode: 'side' | 'over' = 'side';
  @Output() toggleSidebarAfterSelect = new EventEmitter<void>();
  @Output() toggleSidebar = new EventEmitter<void>();
  icons = ICONS;

  private router = inject(Router);

  isRouteActive(path: string): boolean {
    return this.router.url.includes(path);
  }
}
