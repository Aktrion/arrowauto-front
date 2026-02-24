import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ICONS } from '@shared/icons';
import { VehiclesApiService } from '@features/vehicles/services/api/vehicles-api.service';
import { Vehicle } from '@features/vehicles/models/vehicle.model';
import { SearchRequest } from '@shared/utils/search-request.class';

@Component({
  selector: 'app-vehicles-database',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  templateUrl: './vehicles-database.component.html',
  styleUrl: './vehicles-database.component.css',
})
export class VehiclesDatabaseComponent implements OnInit {
  icons = ICONS;
  private vehiclesApi = inject(VehiclesApiService);

  searchRequest = new SearchRequest((params) => this.vehiclesApi.findByPagination(params));

  vehicles = signal<Vehicle[]>([]);
  totalItems = signal(0);
  totalPages = signal(1);
  isLoading = this.searchRequest.isLoading$;

  ngOnInit() {
    this.searchRequest.loadData().subscribe((response) => {
      this.vehicles.set(response.data);
      this.totalItems.set(response.total);
      this.totalPages.set(response.totalPages);
    });
  }

  onSearch(query: string) {
    this.searchRequest.search = query;
    this.searchRequest.setPage(1);
    this.searchRequest.reload();
  }

  nextPage() {
    if (this.searchRequest.page >= this.totalPages()) return;
    this.searchRequest.setPage(this.searchRequest.page + 1);
    this.searchRequest.reload();
  }

  prevPage() {
    if (this.searchRequest.page <= 1) return;
    this.searchRequest.setPage(this.searchRequest.page - 1);
    this.searchRequest.reload();
  }
}
