import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '@shared/icons';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '@shared/components/language-switcher/language-switcher.component';
import { ToastService } from '@core/services/toast.service';
import { AuthStore } from '@auth/store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ReactiveFormsModule,
    TranslateModule,
    LanguageSwitcherComponent,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  icons = ICONS;
  private authStore = inject(AuthStore);
  public router = inject(Router);
  private formBuilder = inject(FormBuilder);
  private toastService = inject(ToastService);
  public form = this.formBuilder.group({
    userName: ['', Validators.required],
    password: ['', Validators.required],
    remember: [false],
    recover: [''],
  });
  public recover = false;
  public isLoading = false;
  public showPassword = false;

  login() {
    if (this.form.invalid) return;
    const { userName, password } = this.form.value;
    this.isLoading = true;
    this.authStore
      .login(userName as string, password as string)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => this.toastService.success('Login successful', 1200),
        error: (err) => {
          this.toastService.error(err.error?.message ?? 'Login failed', 2200);
          console.error('Login failed', err);
        },
      });
  }
}
