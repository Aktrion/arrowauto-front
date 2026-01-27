import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../../shared/icons';
import { Store } from '@ngxs/store';
import { AuthState } from '../../../auth/store/auth.state';

@Component({
  selector: 'app-user-config-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <dialog #modal class="modal">
      <div
        class="modal-box backdrop-blur-xl shadow-2xl border border-white/10 p-0 overflow-hidden relative w-full max-w-md"
      >
        <!-- Close Button -->
        <button
          (click)="close()"
          class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10 text-base-content/50 hover:text-base-content"
        >
          ✕
        </button>

        <!-- Header -->
        <div class="p-6 bg-base-200/50 border-b border-base-200">
          <h3 class="font-bold text-lg flex items-center gap-2">
            <lucide-icon [name]="icons.Settings" class="w-5 h-5 text-primary"></lucide-icon>
            User Configuration
          </h3>
          <p class="text-xs text-base-content/60 mt-1">Manage your personal account settings</p>
        </div>

        <!-- Content -->
        <form [formGroup]="form" (ngSubmit)="save()" class="p-6 space-y-5">
          <div class="space-y-4">
            <div class="form-control">
              <label class="label pt-0 pb-1.5">
                <span class="label-text font-medium text-xs uppercase tracking-wider opacity-70"
                  >Full Name</span
                >
              </label>
              <input
                type="text"
                formControlName="name"
                placeholder="Enter your full name"
                class="input input-bordered w-full input-sm focus:input-primary transition-all focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>

          <div class="modal-action mt-8 flex items-center gap-3 pt-4 border-t border-base-200/50">
            <button
              type="button"
              (click)="close()"
              class="btn btn-sm btn-ghost hover:bg-base-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-sm btn-primary shadow-lg shadow-primary/20 font-bold px-6"
              [disabled]="form.invalid"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop bg-black/20 backdrop-blur-sm">
        <button (click)="close()">close</button>
      </form>
    </dialog>
  `,
})
export class UserConfigModalComponent {
  @ViewChild('modal') modal!: ElementRef<HTMLDialogElement>;
  icons = ICONS;
  store = inject(Store);
  fb = inject(FormBuilder);
  user = this.store.selectSignal(AuthState.user);

  form = this.fb.group({
    name: ['', Validators.required],
  });

  open() {
    const u = this.user();
    if (u) {
      this.form.patchValue({ name: u.name });
    }
    this.modal.nativeElement.showModal();
  }

  close() {
    this.modal.nativeElement.close();
  }

  save() {
    if (this.form.valid) {
      // Here you would dispatch an action to update the user
      console.log('Saving', this.form.value);
      this.close();
    }
  }
}
