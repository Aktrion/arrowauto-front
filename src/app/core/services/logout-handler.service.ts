import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';

@Injectable({
  providedIn: 'root',
})
export class LogoutHandlerService {
  private store = inject(Store);

  //   async triggerLogout(): Promise<void> {
  //     try {
  //       const { LogoutAction } = await import('../../../store/main.store');
  //       this.store.dispatch(new LogoutAction());
  //     } catch (error) {
  //       console.error('Failed to trigger logout:', error);
  //       window.location.href = '/login';
  //     }
  //   }
}
