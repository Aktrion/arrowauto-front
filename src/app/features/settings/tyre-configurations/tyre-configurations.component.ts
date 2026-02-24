import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../../shared/icons';
import {
  CreateTyreConfigurationDto,
  TyreConfiguration,
  TyreConfigurationsService,
} from '../inspection-templates/services/tyre-configurations.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-tyre-configurations',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="form-section space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="form-section-title">Tyre Configurations</h3>
          <p class="form-section-description">
            Manage tyre templates used by inspection points of type "Tyre".
          </p>
        </div>
      </div>

      <div class="rounded-xl border border-base-200 bg-base-100 p-4">
        <h4 class="font-semibold text-base-content mb-4">
          {{ editingId() ? 'Edit Configuration' : 'New Configuration' }}
        </h4>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="label"><span class="label-text">Code</span></label>
            <input type="text" class="input input-bordered w-full" [(ngModel)]="form.code" />
          </div>
          <div>
            <label class="label"><span class="label-text">Amber Up Limit</span></label>
            <input
              type="number"
              class="input input-bordered w-full"
              [(ngModel)]="form.amberUpLimit"
              min="0"
            />
          </div>
          <div>
            <label class="label"><span class="label-text">Red Up Limit</span></label>
            <input
              type="number"
              class="input input-bordered w-full"
              [(ngModel)]="form.redUpLimit"
              min="0"
            />
          </div>
          <div>
            <label class="label"><span class="label-text">Choose Type</span></label>
            <input type="text" class="input input-bordered w-full" [(ngModel)]="form.chooseType" />
          </div>
          <div>
            <label class="label"><span class="label-text">Winter Amber Up Limit</span></label>
            <input
              type="number"
              class="input input-bordered w-full"
              [(ngModel)]="form.winterAmberUpLimit"
              min="0"
            />
          </div>
          <div>
            <label class="label"><span class="label-text">Winter Red Up Limit</span></label>
            <input
              type="number"
              class="input input-bordered w-full"
              [(ngModel)]="form.winterRedUpLimit"
              min="0"
            />
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-error mt-4 text-sm">
            <lucide-icon [name]="icons.CircleAlert" class="h-4 w-4"></lucide-icon>
            <span>{{ error() }}</span>
          </div>
        }

        <div class="mt-4 flex items-center justify-end gap-2">
          @if (editingId()) {
            <button class="btn btn-ghost btn-sm" (click)="cancelEdit()">Cancel</button>
          }
          <button class="btn btn-primary btn-sm" (click)="save()" [disabled]="saving()">
            <lucide-icon [name]="icons.Check" class="h-4 w-4 mr-1"></lucide-icon>
            {{ saving() ? 'Saving...' : editingId() ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>

      <div class="space-y-3">
        @for (config of service.configurations(); track config._id) {
          <div class="rounded-xl border border-base-200 bg-base-100 p-4">
            <div class="flex items-center gap-3">
              <div class="badge badge-outline">{{ config.code || 'No code' }}</div>
              <div class="text-sm text-base-content/70">
                Amber: {{ config.amberUpLimit }} | Red: {{ config.redUpLimit }}
              </div>
              <div class="ml-auto flex items-center gap-2">
                <button class="btn btn-ghost btn-xs" (click)="edit(config)">
                  <lucide-icon [name]="icons.Pencil" class="h-4 w-4"></lucide-icon>
                  Edit
                </button>
                <button class="btn btn-ghost btn-xs text-error" (click)="remove(config._id)">
                  <lucide-icon [name]="icons.Trash2" class="h-4 w-4"></lucide-icon>
                  Delete
                </button>
              </div>
            </div>
          </div>
        }
        @if (service.configurations().length === 0) {
          <div
            class="rounded-xl border border-dashed border-base-300 p-6 text-center text-base-content/60"
          >
            No tyre configurations yet. Create one above.
          </div>
        }
      </div>
    </div>
  `,
})
export class TyreConfigurationsComponent {
  icons = ICONS;
  service = inject(TyreConfigurationsService);
  private notificationService = inject(ToastService);

  saving = signal(false);
  editingId = signal<string | null>(null);
  error = signal<string | null>(null);

  form = {
    code: '',
    amberUpLimit: 0,
    redUpLimit: 0,
    chooseType: '',
    winterAmberUpLimit: 0,
    winterRedUpLimit: 0,
  };

  save() {
    this.error.set(null);
    if (!this.form.code.trim()) {
      this.error.set('Code is required.');
      return;
    }

    const payload: CreateTyreConfigurationDto = {
      code: this.form.code.trim(),
      amberUpLimit: Number(this.form.amberUpLimit),
      redUpLimit: Number(this.form.redUpLimit),
      chooseType: this.form.chooseType?.trim() || undefined,
      winterAmberUpLimit: Number(this.form.winterAmberUpLimit) || undefined,
      winterRedUpLimit: Number(this.form.winterRedUpLimit) || undefined,
    };

    this.saving.set(true);
    const request$ = this.editingId()
      ? this.service.update(this.editingId()!, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: () => {
        this.notificationService.success(
          this.editingId()
            ? 'Tyre configuration updated successfully.'
            : 'Tyre configuration created successfully.',
        );
        this.resetForm();
        this.saving.set(false);
      },
      error: () => {
        this.error.set('Failed to save tyre configuration.');
        this.notificationService.error('Failed to save tyre configuration.');
        this.saving.set(false);
      },
    });
  }

  edit(config: TyreConfiguration) {
    this.editingId.set(config._id);
    this.error.set(null);
    this.form = {
      code: config.code || '',
      amberUpLimit: config.amberUpLimit ?? 0,
      redUpLimit: config.redUpLimit ?? 0,
      chooseType: config.chooseType || '',
      winterAmberUpLimit: config.winterAmberUpLimit ?? 0,
      winterRedUpLimit: config.winterRedUpLimit ?? 0,
    };
  }

  cancelEdit() {
    this.resetForm();
  }

  remove(id: string) {
    if (!confirm('Delete this tyre configuration?')) return;
    this.service.delete(id).subscribe({
      next: () => this.notificationService.success('Tyre configuration deleted successfully.'),
      error: () => this.notificationService.error('Failed to delete tyre configuration.'),
    });
    if (this.editingId() === id) {
      this.resetForm();
    }
  }

  private resetForm() {
    this.editingId.set(null);
    this.error.set(null);
    this.form = {
      code: '',
      amberUpLimit: 0,
      redUpLimit: 0,
      chooseType: '',
      winterAmberUpLimit: 0,
      winterRedUpLimit: 0,
    };
  }
}
