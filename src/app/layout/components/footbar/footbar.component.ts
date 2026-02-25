import { Component, inject } from '@angular/core';
import { environment } from '@env/environment';

@Component({
  selector: 'app-footbar',
  standalone: true,
  templateUrl: './footbar.component.html',
})
export class FootbarComponent {
  readonly version = environment.version ?? '0.0.1';
}
