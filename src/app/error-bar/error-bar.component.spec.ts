import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorBarComponent } from './error-bar.component';

describe('ErrorBarComponent', () => {
  let component: ErrorBarComponent;
  let fixture: ComponentFixture<ErrorBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ErrorBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ErrorBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
