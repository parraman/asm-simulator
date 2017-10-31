import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistersViewComponent } from './registers-view.component';

describe('RegistersViewComponent', () => {
  let component: RegistersViewComponent;
  let fixture: ComponentFixture<RegistersViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RegistersViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistersViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
