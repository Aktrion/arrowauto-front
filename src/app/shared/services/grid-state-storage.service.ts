import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GridStateStorageService {
  private readonly prefix = 'grid_state_';

  saveQuickFilter(storageKey: string, value: string): void {
    localStorage.setItem(this.prefix + storageKey, value);
  }

  getQuickFilter(storageKey: string): string {
    return localStorage.getItem(this.prefix + storageKey) ?? '';
  }
}
