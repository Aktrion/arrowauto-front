import { Component, Output, EventEmitter, inject, ViewChild, input } from '@angular/core';

import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageSwitcherComponent } from '@shared/components/language-switcher/language-switcher.component';
import { ICONS } from '@shared/icons';
import { AuthStore } from '@auth/store/auth.store';
import { UserConfigModalComponent } from '@layout/components/user-config-modal/user-config-modal.component';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    LanguageSwitcherComponent,
    UserConfigModalComponent,
    TranslateModule,
  ],

  templateUrl: './header.component.html',
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  collapsed = input<boolean>(false);
  icons = ICONS;

  private authStore = inject(AuthStore);
  user = this.authStore.user;

  @ViewChild(UserConfigModalComponent) userConfigModal!: UserConfigModalComponent;

  logout() {
    this.authStore.logout().subscribe();
  }

  editProfile() {
    this.userConfigModal.open();
  }
}
