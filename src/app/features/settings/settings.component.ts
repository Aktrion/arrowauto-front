import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperationMaster } from '@shared/models/operation.model';
import { OperationService } from '@shared/services/operation.service';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '@shared/icons';
import { InspectionTemplatesListComponent } from '@features/settings/inspection-templates/inspection-templates-list/inspection-templates-list.component';
import { TyreConfigurationsComponent } from '@features/settings/tyre-configurations/tyre-configurations.component';

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
export class SettingsComponent implements OnInit {
  icons = ICONS;
  private operationService = inject(OperationService);

  activeSection = signal('operations');
  operations = signal<OperationMaster[]>([]);

  ngOnInit(): void {
    this.operationService.fetchOperationMasters().subscribe((ops) => this.operations.set(ops));
  }

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
  ];

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
      this.operationService.updateOperationMaster(editId, form).subscribe({
        next: () => {
          this.savingOperation.set(false);
          this.showOperationForm.set(false);
          this.editingOperationId.set(null);
          this.operationService.fetchOperationMasters().subscribe((ops) => this.operations.set(ops));
        },
        error: () => {
          this.savingOperation.set(false);
        },
      });
    } else {
      this.operationService.createOperationMaster(form).subscribe({
        next: () => {
          this.savingOperation.set(false);
          this.showOperationForm.set(false);
          this.operationService.fetchOperationMasters().subscribe((ops) => this.operations.set(ops));
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
    this.operationService.deleteOperationMaster(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.operationService.fetchOperationMasters().subscribe((ops) => this.operations.set(ops));
      },
    });
  }

  updateFormField(field: string, value: any) {
    this.operationForm.update((f) => ({ ...f, [field]: value }));
  }
}
