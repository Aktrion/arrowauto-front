import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiclesDatabase } from './vehicles-database';

describe('VehiclesDatabase', () => {
  let component: VehiclesDatabase;
  let fixture: ComponentFixture<VehiclesDatabase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiclesDatabase]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiclesDatabase);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
