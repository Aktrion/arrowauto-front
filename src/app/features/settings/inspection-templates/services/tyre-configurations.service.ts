import { Injectable, inject, signal } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { tap } from 'rxjs';
import {
  TyreConfiguration,
  CreateTyreConfigurationDto,
  UpdateTyreConfigurationDto,
} from '@features/settings/inspection-templates/models/tyre-configuration.model';

@Injectable({
  providedIn: 'root',
})
export class TyreConfigurationsService extends BaseCrudService<
  TyreConfiguration,
  CreateTyreConfigurationDto,
  UpdateTyreConfigurationDto
> {
  configurations = signal<TyreConfiguration[]>([]);

  constructor() {
    super('/tyre-configurations');
    this.getAll();
  }

  getAll() {
    return this.findAll()
      .pipe(tap((configs) => this.configurations.set(configs)))
      .subscribe();
  }

  override create(dto: CreateTyreConfigurationDto) {
    return super.create(dto).pipe(tap(() => this.getAll()));
  }

  override update(id: string, dto: UpdateTyreConfigurationDto) {
    return super.update(id, dto).pipe(tap(() => this.getAll()));
  }

  deleteById(id: string) {
    return this.deleteOne(id).pipe(tap(() => this.getAll()));
  }
}
