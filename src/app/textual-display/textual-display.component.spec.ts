import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TextualDisplayComponent } from './textual-display.component';

describe('TextualDisplayComponent', () => {
  let component: TextualDisplayComponent;
  let fixture: ComponentFixture<TextualDisplayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TextualDisplayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TextualDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
