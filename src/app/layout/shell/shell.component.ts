import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../layout/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../layout/components/header/header.component';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  isSidebarCollapsed = signal(false);
  icons = ICONS;

  toggleSidebar() {
    this.isSidebarCollapsed.update((v) => !v);
  }
}
