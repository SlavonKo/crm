import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThemeSwitch } from './theme-switch';

describe('ThemeSwitch', () => {
  let component: ThemeSwitch;
  let fixture: ComponentFixture<ThemeSwitch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeSwitch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThemeSwitch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
