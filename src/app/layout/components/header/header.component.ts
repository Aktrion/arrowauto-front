import { Component, Output, EventEmitter, inject, ViewChild } from '@angular/core';

import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import { ICONS } from '../../../shared/icons';
import { Store } from '@ngxs/store';
import { AuthState } from '../../../auth/store/auth.state';
import { Logout } from '../../../auth/store/auth.actions';
import { User } from '../../../auth/models/user.model';
import { UserConfigModalComponent } from '../user-config-modal/user-config-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, LanguageSwitcherComponent, UserConfigModalComponent],

  templateUrl: './header.component.html',
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  icons = ICONS;

  private store = inject(Store);
  user = this.store.selectSignal(AuthState.user);

  @ViewChild(UserConfigModalComponent) userConfigModal!: UserConfigModalComponent;

  logout() {
    this.store.dispatch(new Logout());
  }

  editProfile() {
    this.userConfigModal.open();
  }
}
