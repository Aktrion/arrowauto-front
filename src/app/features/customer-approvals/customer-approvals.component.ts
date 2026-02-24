import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { VehicleInstancesApiService } from '@features/vehicles/services/api/vehicle-instances-api.service';
import { ToastService } from '@core/services/toast.service';
import { Product } from '@features/vehicles/models/vehicle.model';

@Component({
  selector: 'app-customer-approvals',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  template: `
    <div class="p-4 sm:p-8 space-y-8 animate-fade-in">
      <div>
        <h1 class="text-3xl font-black text-base-content tracking-tight">Pending Approvals</h1>
        <p class="text-base-content/60 font-medium mt-1">
          Vehicles waiting for customer approval on estimated repairs
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (vehicle of pendingVehicles(); track vehicle._id) {
          <div
            class="card-premium rounded-2xl border border-warning/30 hover:border-warning/60 bg-warning/5 transition-all group overflow-hidden cursor-pointer"
            (click)="openPortal(vehicle.vehicleId!)"
          >
            <div class="p-6 relative">
              <lucide-icon
                [name]="icons.User"
                class="absolute top-4 right-4 h-6 w-6 text-warning/40 group-hover:text-warning transition-colors"
              ></lucide-icon>
              <h3
                class="text-xl font-bold text-base-content mb-1 group-hover:text-warning transition-colors"
              >
                {{ vehicle.vehicle?.make }} {{ vehicle.vehicle?.model }}
              </h3>
              <p
                class="text-sm text-base-content/60 font-mono bg-base-100 px-2 py-0.5 rounded-md inline-block"
              >
                {{ vehicle.vehicle?.licensePlate || vehicle.vehicle?.vin }}
              </p>

              <div class="mt-6 flex items-center justify-between">
                <span class="badge badge-warning font-bold text-xs uppercase tracking-wider py-2.5"
                  >Pending Approval</span
                >
                <button
                  class="btn btn-circle btn-sm btn-ghost hover:bg-warning/20 hover:text-warning"
                >
                  <lucide-icon [name]="icons.ArrowRight" class="h-4 w-4"></lucide-icon>
                </button>
              </div>
            </div>
          </div>
        } @empty {
          <div class="col-span-full">
            <div
              class="text-center py-24 bg-base-200/20 rounded-3xl border-2 border-dashed border-base-200"
            >
              <div
                class="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <lucide-icon
                  [name]="icons.CheckCircle2"
                  class="h-10 w-10 text-success/50"
                ></lucide-icon>
              </div>
              <h3 class="font-bold text-xl text-base-content mb-2">No pending approvals</h3>
              <p class="text-base-content/60 max-w-xs mx-auto">
                All sent estimations have been processed or none are currently pending.
              </p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class CustomerApprovalsComponent implements OnInit {
  private instanceApi = inject(VehicleInstancesApiService);
  private router = inject(Router);
  icons = ICONS;

  vehicles = signal<Product[]>([]);

  pendingVehicles = computed(() =>
    this.vehicles().filter(
      (v) => (v.status as string) === 'pending_approval' || v.status === 'awaiting_approval',
    ),
  );

  ngOnInit(): void {
    this.instanceApi
      .findByPagination({
        page: 1,
        limit: 500,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      .subscribe((res) => this.vehicles.set(res.data ?? []));
  }

  openPortal(vehicleId: string) {
    // Navigate to the public customer portal link with the vehicle ID parameter
    this.router.navigate(['/customer-portal'], { queryParams: { vehicleId } });
  }
}
