import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { AuthStore } from '@auth/store/auth.store';
import { CountryEnum, countryNamesMap } from '@shared/enums/country.enum';
import { User } from '@shared/models/user.model';
import { SelectComponent, SelectOption } from '@shared/components/select/select.component';

@Component({
  selector: 'app-user-config-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    TranslateModule,
    SelectComponent,
  ],
  template: `
    <dialog #modal class="modal">
      <div
        class="modal-box backdrop-blur-xl shadow-2xl border border-white/10 p-0 overflow-hidden relative w-full max-w-xl"
      >
        <!-- Decoration -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent"></div>

        <!-- Close Button -->
        <button
          (click)="close()"
          class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 z-10 text-base-content/50 hover:text-base-content transition-colors"
        >
          ✕
        </button>

        <!-- Header -->
        <div class="p-8 bg-base-200/50 border-b border-base-200 relative overflow-hidden">
          <div
            class="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"
          ></div>
          <div class="flex items-center gap-6 relative z-10">
            <!-- Avatar Preview -->
            <div class="relative group">
              <div class="avatar online placeholder">
                <div
                  class="w-20 rounded-2xl bg-neutral text-neutral-content ring ring-primary ring-offset-base-100 ring-offset-2 shadow-xl overflow-hidden"
                >
                  <ng-container *ngIf="avatarPreview() || user()?.imageUrl; else noAvatar">
                    <img [src]="avatarPreview() || user()?.imageUrl" [alt]="user()?.userName" />
                  </ng-container>
                  <ng-template #noAvatar>
                    <img src="assets/img/icons/user.png" alt="Default Avatar" />
                  </ng-template>
                </div>
              </div>
              <input
                type="file"
                #fileInput
                (change)="onFileSelected($event)"
                accept="image/*"
                class="hidden"
              />
              <button
                type="button"
                (click)="fileInput.click()"
                class="absolute -bottom-2 -right-2 btn btn-circle btn-xs btn-primary shadow-lg scale-0 group-hover:scale-100 transition-transform"
              >
                <lucide-icon [name]="icons.Camera" class="w-3 h-3"></lucide-icon>
              </button>
            </div>

            <div class="flex-1">
              <h3 class="font-bold text-2xl tracking-tight">
                {{ user()?.name || ('PROFILE.MODAL.TITLE' | translate) }}
              </h3>
              <p class="text-sm text-base-content/60">{{ user()?.emails?.[0] }}</p>
              <div class="flex gap-2 mt-2">
                <span class="badge badge-sm badge-outline opacity-70">{{
                  user()?.role?.name | uppercase
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
          <form [formGroup]="form" (ngSubmit)="save()" class="p-8 space-y-8">
            <!-- General Info -->
            <section class="space-y-6">
              <div class="flex items-center gap-2 border-b border-base-200 pb-2">
                <lucide-icon [name]="icons.User" class="w-4 h-4 text-primary"></lucide-icon>
                <h4 class="text-sm font-bold uppercase tracking-widest opacity-50">
                  {{ 'PROFILE.MODAL.GENERAL_INFO' | translate }}
                </h4>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Full Name -->
                <div class="form-control w-full">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.FULL_NAME' | translate }}</span
                    >
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [name]="icons.User"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
                    ></lucide-icon>
                    <input
                      type="text"
                      formControlName="name"
                      [placeholder]="'PROFILE.MODAL.FULL_NAME' | translate"
                      class="input input-bordered w-full pl-11 h-11 bg-base-100/50 focus:input-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <!-- Username -->
                <div class="form-control w-full">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.USERNAME' | translate }}</span
                    >
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [name]="icons.AtSign"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
                    ></lucide-icon>
                    <input
                      type="text"
                      formControlName="userName"
                      [placeholder]="'PROFILE.MODAL.USERNAME' | translate"
                      class="input input-bordered w-full pl-11 h-11 bg-base-100/50 focus:input-primary transition-all duration-200"
                    />
                  </div>
                </div>

                <!-- Email -->
                <div class="form-control w-full md:col-span-2">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.EMAIL' | translate }}</span
                    >
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [name]="icons.Mail"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
                    ></lucide-icon>
                    <input
                      type="text"
                      formControlName="emails"
                      placeholder="email1@example.com, email2@example.com"
                      class="input input-bordered w-full pl-11 h-11 bg-base-100/50 focus:input-primary transition-all duration-200"
                    />
                  </div>
                  <label class="label px-1">
                    <span class="label-text-alt text-base-content/40">{{
                      'PROFILE.MODAL.EMAILS_HINT' | translate
                    }}</span>
                  </label>
                </div>

                <!-- Language -->
                <div class="form-control w-full">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.LANGUAGE' | translate }}</span
                    >
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [name]="icons.Globe"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 z-10"
                    ></lucide-icon>
                    <app-select
                      [options]="languageOptions"
                      [selectedValue]="form.get('language')?.value"
                      (selectionChange)="form.get('language')?.setValue($event)"
                      [clearable]="false"
                    ></app-select>
                  </div>
                </div>

                <!-- Country -->
                <div class="form-control w-full">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.COUNTRY' | translate }}</span
                    >
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [name]="icons.MapPin"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 z-10"
                    ></lucide-icon>
                    <app-select
                      [options]="countrySelectOptions"
                      [selectedValue]="form.get('country')?.value"
                      (selectionChange)="form.get('country')?.setValue($event)"
                      [placeholder]="'PROFILE.MODAL.SELECT_COUNTRY' | translate"
                    ></app-select>
                  </div>
                </div>

                <!-- Timezone -->
                <div class="form-control w-full">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.TIMEZONE' | translate }}</span
                    >
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [name]="icons.Clock"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 z-10"
                    ></lucide-icon>
                    <app-select
                      [options]="timezoneSelectOptions"
                      [selectedValue]="form.get('timeZone')?.value"
                      (selectionChange)="form.get('timeZone')?.setValue($event)"
                      [placeholder]="'Select timezone'"
                    ></app-select>
                  </div>
                </div>

                <!-- Role -->
                <div class="form-control w-full">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.ROLE' | translate }}</span
                    >
                  </label>
                  <div class="relative opacity-60">
                    <lucide-icon
                      [name]="icons.ShieldCheck"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
                    ></lucide-icon>
                    <input
                      type="text"
                      [value]="user()?.role?.name | uppercase"
                      disabled
                      class="input input-bordered w-full pl-11 h-11 bg-base-200 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </section>

            <!-- Password Change SECTION -->
            <section class="space-y-6">
              <div class="flex items-center justify-between border-b border-base-200 pb-2">
                <div class="flex items-center gap-2">
                  <lucide-icon [name]="icons.Lock" class="w-4 h-4 text-primary"></lucide-icon>
                  <h4 class="text-sm font-bold uppercase tracking-widest opacity-50">
                    {{ 'PROFILE.MODAL.SECURITY.TITLE' | translate }}
                  </h4>
                </div>
                <button
                  type="button"
                  (click)="isChangingPassword.set(!isChangingPassword())"
                  class="btn btn-ghost btn-xs text-primary"
                >
                  {{
                    (isChangingPassword()
                      ? 'PROFILE.MODAL.SECURITY.CANCEL_CHANGE'
                      : 'PROFILE.MODAL.SECURITY.CHANGE_PASSWORD'
                    ) | translate
                  }}
                </button>
              </div>

              <div *ngIf="isChangingPassword()" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Current Password -->
                <div class="form-control w-full md:col-span-2">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.SECURITY.CURRENT_PASSWORD' | translate }}</span
                    >
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [name]="icons.KeyRound"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
                    ></lucide-icon>
                    <input
                      [type]="showPasswords() ? 'text' : 'password'"
                      formControlName="currentPassword"
                      placeholder="••••••••"
                      class="input input-bordered w-full pl-10 pr-10 h-11 bg-base-100/50 focus:input-primary transition-all duration-200"
                    />
                    <button
                      type="button"
                      (click)="showPasswords.set(!showPasswords())"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-primary transition-colors"
                    >
                      <lucide-icon
                        [name]="showPasswords() ? icons.EyeOff : icons.Eye"
                        class="w-4 h-4"
                      ></lucide-icon>
                    </button>
                  </div>
                </div>

                <!-- New Password -->
                <div class="form-control w-full">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.SECURITY.NEW_PASSWORD' | translate }}</span
                    >
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [name]="icons.Lock"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
                    ></lucide-icon>
                    <input
                      [type]="showPasswords() ? 'text' : 'password'"
                      formControlName="newPassword"
                      placeholder="••••••••"
                      class="input input-bordered w-full pl-10 h-11 bg-base-100/50 focus:input-primary transition-all duration-200"
                    />
                  </div>
                  <label
                    class="label"
                    *ngIf="
                      form.get('newPassword')?.touched &&
                      form.get('newPassword')?.errors?.['minlength']
                    "
                  >
                    <span class="label-text-alt text-error">{{
                      'PROFILE.MODAL.SECURITY.MIN_LENGTH' | translate
                    }}</span>
                  </label>
                </div>

                <!-- Confirm Password -->
                <div class="form-control w-full">
                  <label class="label px-1">
                    <span
                      class="label-text font-semibold text-xs uppercase tracking-wider opacity-60"
                      >{{ 'PROFILE.MODAL.SECURITY.CONFIRM_PASSWORD' | translate }}</span
                    >
                  </label>
                  <div class="relative">
                    <lucide-icon
                      [name]="icons.Check"
                      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
                    ></lucide-icon>
                    <input
                      [type]="showPasswords() ? 'text' : 'password'"
                      formControlName="confirmPassword"
                      placeholder="••••••••"
                      class="input input-bordered w-full pl-10 h-11 bg-base-100/50 focus:input-primary transition-all duration-200"
                    />
                  </div>
                  <label
                    class="label"
                    *ngIf="form.get('confirmPassword')?.touched && form.errors?.['mismatch']"
                  >
                    <span class="label-text-alt text-error">{{
                      'PROFILE.MODAL.SECURITY.MISMATCH' | translate
                    }}</span>
                  </label>
                </div>
              </div>
            </section>
          </form>
        </div>

        <!-- Footer/Actions -->
        <div
          class="p-8 border-t border-base-200 bg-base-200/30 flex items-center justify-end gap-3"
        >
          <button
            type="button"
            (click)="close()"
            class="btn btn-ghost hover:bg-base-200 px-6 rounded-xl"
          >
            {{ 'PROFILE.MODAL.CANCEL' | translate }}
          </button>
          <button
            type="button"
            (click)="save()"
            class="btn btn-primary shadow-lg shadow-primary/20 px-8 font-bold rounded-xl"
            [disabled]="
              form.invalid ||
              (form.pristine && !isChangingPassword() && !avatarPreview()) ||
              (isChangingPassword() && !form.get('newPassword')?.value)
            "
          >
            {{ 'PROFILE.MODAL.SAVE' | translate }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop bg-black/40 backdrop-blur-sm">
        <button (click)="close()">close</button>
      </form>
    </dialog>
  `,
  styles: [
    `
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: hsl(var(--bc) / 0.1);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: hsl(var(--bc) / 0.2);
      }
    `,
  ],
})
export class UserConfigModalComponent {
  @ViewChild('modal') modal!: ElementRef<HTMLDialogElement>;
  icons = ICONS;
  authStore = inject(AuthStore);
  fb = inject(FormBuilder);
  user = this.authStore.user;

  isChangingPassword = signal(false);
  showPasswords = signal(false);
  avatarPreview = signal<string | null>(null);

  countries = Object.values(CountryEnum);
  countryNames = countryNamesMap;
  timezones = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : [];

  languageOptions: SelectOption[] = [
    { label: 'English (US)', value: 'en' },
    { label: 'Español (ES)', value: 'es' },
  ];

  countrySelectOptions: SelectOption[] = this.countries.map((c) => ({
    label: countryNamesMap.get(c) || c,
    value: c,
  }));

  timezoneSelectOptions: SelectOption[] = this.timezones.map((tz: string) => ({
    label: tz,
    value: tz,
  }));

  form = this.fb.group(
    {
      name: ['', Validators.required],
      userName: ['', Validators.required],
      emails: ['', Validators.required],
      language: ['en'],
      country: [null as CountryEnum | null],
      timeZone: [Intl.DateTimeFormat().resolvedOptions().timeZone],
      currentPassword: [''],
      newPassword: ['', [Validators.minLength(8)]],
      confirmPassword: [''],
    },
    { validators: this.passwordMatchValidator },
  );

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { mismatch: true };
    }
    return null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  open() {
    const u = this.user();
    if (u) {
      this.form.patchValue({
        name: u.name,
        userName: u.userName,
        emails: u.emails?.join(', ') || '',
        language: u.language || 'en',
        country: u.country || null,
        timeZone: u.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      this.isChangingPassword.set(false);
      this.showPasswords.set(false);
      this.avatarPreview.set(null);
      this.form.markAsPristine();
      this.form.markAsUntouched();
    }
    this.modal.nativeElement.showModal();
  }

  close() {
    this.modal.nativeElement.close();
  }

  save() {
    if (this.isChangingPassword()) {
      this.form.get('currentPassword')?.markAsTouched();
      this.form.get('newPassword')?.markAsTouched();
      this.form.get('confirmPassword')?.markAsTouched();
      this.form.updateValueAndValidity();
    }

    if (this.form.valid) {
      const { name, userName, emails, language, newPassword, country, timeZone } = this.form.value;
      const payload: Partial<User> = {
        name: name || undefined,
        userName: userName || undefined,
        emails: emails
          ? emails
              .split(',')
              .map((e: string) => e.trim())
              .filter((e: string) => e !== '')
          : [],
        language: language || undefined,
        country: (country as CountryEnum) || undefined,
        timeZone: timeZone || undefined,
      };

      if (this.avatarPreview()) {
        payload.imageUrl = this.avatarPreview()!;
      }

      if (this.isChangingPassword() && newPassword) {
        payload.password = newPassword;
      }

      this.authStore.updateUser(payload);
      this.close();
    }
  }
}
