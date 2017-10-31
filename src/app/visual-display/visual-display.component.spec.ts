import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VisualDisplayComponent } from './visual-display.component';

describe('VisualDisplayComponent', () => {
  let component: VisualDisplayComponent;
  let fixture: ComponentFixture<VisualDisplayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VisualDisplayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VisualDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
