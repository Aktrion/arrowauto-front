import { Component, ElementRef, EventEmitter, inject, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { Vehicle } from '@features/vehicles/models/vehicle.model';
import { VehiclesApiService } from '@features/vehicles/services/api/vehicles-api.service';
import { ToastService } from '@core/services/toast.service';
import { ICONS } from '@shared/icons';

@Component({
  selector: 'app-vehicle-edit-modal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './vehicle-edit-modal.component.html',
})
export class VehicleEditModalComponent {
  icons = ICONS;

  @ViewChild('modal') modalRef!: ElementRef<HTMLDialogElement>;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private vehiclesApi = inject(VehiclesApiService);
  private toastService = inject(ToastService);

  editForm: Partial<Vehicle> & { _id?: string } = {};
  private savedSuccessfully = false;

  open(item: Vehicle): void {
    this.savedSuccessfully = false;
    const id = (item as any)._id || (item as any).id;
    if (!id) return;
    const model = item.model ?? (item as any).vehicleModel;
    this.editForm = {
      _id: id,
      make: item.make,
      model,
      licensePlate: item.licensePlate,
      vin: item.vin,
      colour: item.colour,
      engine: item.engine,
      mileage: item.mileage,
    };
    this.modalRef?.nativeElement?.showModal();
  }

  close(): void {
    this.modalRef?.nativeElement?.close();
  }

  onDialogClosed(): void {
    if (!this.savedSuccessfully) {
      this.cancelled.emit();
    }
    this.savedSuccessfully = false;
  }

  save(): void {
    const id = this.editForm._id;
    if (!id) return;
    this.vehiclesApi
      .update(id, {
        make: this.editForm.make,
        model: this.editForm.model,
        licensePlate: this.editForm.licensePlate,
        vin: this.editForm.vin,
        colour: this.editForm.colour,
        engine: this.editForm.engine,
        mileage: this.editForm.mileage,
      })
      .subscribe({
        next: () => {
          this.savedSuccessfully = true;
          this.toastService.success('VEHICLES.TOAST.UPDATED');
          this.saved.emit();
          this.close();
        },
        error: () => this.toastService.error('VEHICLES.TOAST.UPDATE_FAILED'),
      });
  }
}
