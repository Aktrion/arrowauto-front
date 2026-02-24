import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiclesDatabaseComponent } from '@features/vehicles/vehicles-database/vehicles-database.component';

describe('VehiclesDatabaseComponent', () => {
  let component: VehiclesDatabaseComponent;
  let fixture: ComponentFixture<VehiclesDatabaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiclesDatabaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiclesDatabaseComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
