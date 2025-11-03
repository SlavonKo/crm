import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LangSwitc } from './lang-switch';

describe('LangSwitc', () => {
  let component: LangSwitc;
  let fixture: ComponentFixture<LangSwitc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LangSwitc]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LangSwitc);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
