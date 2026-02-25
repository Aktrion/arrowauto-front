import { Injectable, inject } from '@angular/core';
import { AuthStore } from '@auth/store/auth.store';

@Injectable({
  providedIn: 'root',
})
export class LogoutHandlerService {
  private authStore = inject(AuthStore);

  triggerLogout(): void {
    this.authStore.logout().subscribe();
  }
}
