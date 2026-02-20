import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperationApiService, OperationMaster } from '../../shared/services/operation-api.service';
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
  private operationApiService = inject(OperationApiService);
  private inspectionService = inject(InspectionService);
  private userService = inject(UserService);

  activeSection = signal('general');
  operations = this.operationApiService.operations;
  users = this.userService.users;

  // Operation CRUD state
  showOperationForm = signal(false);
  editingOperationId = signal<string | null>(null);
  operationForm = signal<Omit<OperationMaster, 'id'>>({
    shortName: '',
    description: '',
    defaultDuration: 30,
    defaultRatePerHour: 25,
  });
  savingOperation = signal(false);
  deleteConfirmId = signal<string | null>(null);

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

  openAddOperation() {
    this.editingOperationId.set(null);
    this.operationForm.set({
      shortName: '',
      description: '',
      defaultDuration: 30,
      defaultRatePerHour: 25,
    });
    this.showOperationForm.set(true);
  }

  openEditOperation(op: OperationMaster) {
    this.editingOperationId.set(op.id);
    this.operationForm.set({
      shortName: op.shortName,
      description: op.description || '',
      defaultDuration: op.defaultDuration,
      defaultRatePerHour: op.defaultRatePerHour,
    });
    this.showOperationForm.set(true);
  }

  cancelOperationForm() {
    this.showOperationForm.set(false);
    this.editingOperationId.set(null);
  }

  saveOperation() {
    const form = this.operationForm();
    if (!form.shortName.trim()) return;

    this.savingOperation.set(true);
    const editId = this.editingOperationId();

    if (editId) {
      this.operationApiService.update(editId, form).subscribe({
        next: () => {
          this.savingOperation.set(false);
          this.showOperationForm.set(false);
          this.editingOperationId.set(null);
        },
        error: () => {
          this.savingOperation.set(false);
        },
      });
    } else {
      this.operationApiService.create(form).subscribe({
        next: () => {
          this.savingOperation.set(false);
          this.showOperationForm.set(false);
        },
        error: () => {
          this.savingOperation.set(false);
        },
      });
    }
  }

  confirmDeleteOperation(id: string) {
    this.deleteConfirmId.set(id);
  }

  cancelDelete() {
    this.deleteConfirmId.set(null);
  }

  deleteOperation(id: string) {
    this.operationApiService.delete(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
      },
    });
  }

  updateFormField(field: string, value: any) {
    this.operationForm.update((f) => ({ ...f, [field]: value }));
  }
}
