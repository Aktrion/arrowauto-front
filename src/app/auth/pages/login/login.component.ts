import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../../shared/icons';
// import { AuthService } from '../../service/auth.service'; // Removed unused
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import { Store } from '@ngxs/store';
import { Login } from '../../store/auth.actions';

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
  styles: [
    `
      .glass-panel {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .animated-gradient {
        background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
        background-size: 400% 400%;
        animation: gradient 15s ease infinite;
      }

      @keyframes gradient {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      .input-group:focus-within label {
        color: #3b82f6;
      }

      .input-group:focus-within svg {
        color: #3b82f6;
      }
    `,
  ],
})
export class LoginComponent {
  icons = ICONS;
  // private authService = inject(AuthService); // Removed
  private store = inject(Store);
  public router = inject(Router);
  private formBuilder = inject(FormBuilder);
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
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Login failed', err);
        },
      });
  }
}
