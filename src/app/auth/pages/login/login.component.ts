import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '@shared/icons';
// import { AuthService } from '../../service/auth.service'; // Removed unused
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '@shared/components/language-switcher/language-switcher.component';
import { Store } from '@ngxs/store';
import { Login } from '@auth/store/auth.actions';
import { ToastService } from '@core/services/toast.service';

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
  // private authService = inject(AuthService); // Removed
  private store = inject(Store);
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
    this.store
      .dispatch(new Login({ userName: userName as string, password: password as string }))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.success('Login successful', 1200);
        },
        error: (err) => {
          this.isLoading = false;
          this.toastService.error(err.error.message, 2200);
          console.error('Login failed', err);
        },
      });
  }
}
