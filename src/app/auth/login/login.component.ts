import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
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
  // Logic for login (form handling) would go here
  // For now it's just frontend visuals
}
