import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
    userName: [this.authStore.getSavedUserName(), Validators.required],
    password: ['', Validators.required],
    remember: [!!localStorage.getItem('auth_remember')],
  });
  public isLoading = false;
  public showPassword = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login() {
    if (this.form.invalid) return;
    const { userName, password, remember } = this.form.value;
    this.isLoading = true;
    this.authStore.login(userName as string, password as string, !!remember).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success('Login successful');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error(err.error?.message ?? 'Login failed');
        console.error('Login failed', err);
      },
    });
  }
}
