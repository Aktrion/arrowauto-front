import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { User } from '@shared/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersApiService extends BaseCrudService<User, Partial<User>, Partial<User>> {
  constructor() {
    super('/users');
  }
}
