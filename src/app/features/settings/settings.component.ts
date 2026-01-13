import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperationService } from '../../shared/services/operation.service';
import { InspectionService } from '../inspection/services/inspection.service';
import { UserService } from '../../core/services/user.service';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  icons = ICONS;
  private operationService = inject(OperationService);
  private inspectionService = inject(InspectionService);
  private userService = inject(UserService);

  activeSection = signal('general');
  operations = this.operationService.operations;
  inspectionPoints = this.inspectionService.inspectionPoints;
  users = this.userService.users;

  sections = [
    {
      id: 'general',
      name: 'General',
      icon: this.icons.Settings,
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: this.icons.Briefcase,
    },
    {
      id: 'inspection',
      name: 'Inspection Points',
      icon: this.icons.ClipboardCheck,
    },
    {
      id: 'users',
      name: 'Users & Operators',
      icon: this.icons.Users,
    },
    {
      id: 'rates',
      name: 'Labor Rates',
      icon: this.icons.CreditCard,
    },
  ];

  inspectionCategories() {
    return [...new Set(this.inspectionPoints().map((p) => p.category))];
  }

  getPointsByCategory(category: string) {
    return this.inspectionPoints().filter((p) => p.category === category);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
