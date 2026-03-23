import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemsConfiguration } from './items-configuration';

describe('ItemsConfiguration', () => {
  let component: ItemsConfiguration;
  let fixture: ComponentFixture<ItemsConfiguration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemsConfiguration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemsConfiguration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
