import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperationService } from '../../shared/services/operation.service';
import { InspectionService } from '../inspection/services/inspection.service';
import { UserService } from '../../core/services/user.service';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons';
import { InspectionTemplatesListComponent } from './inspection-templates/inspection-templates-list/inspection-templates-list.component';
import { TyreConfigurationsComponent } from './tyre-configurations/tyre-configurations.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    InspectionTemplatesListComponent,
    TyreConfigurationsComponent,
  ],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  icons = ICONS;
  private operationService = inject(OperationService);
  private inspectionService = inject(InspectionService);
  private userService = inject(UserService);

  activeSection = signal('general');
  operations = this.operationService.operations;
  // inspectionPoints = this.inspectionService.inspectionPoints; // Deprecated
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
      id: 'inspection-templates',
      name: 'Inspection Templates',
      icon: this.icons.FileText,
    },
    {
      id: 'tyre-configurations',
      name: 'Tyre Configurations',
      icon: this.icons.Disc,
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

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
