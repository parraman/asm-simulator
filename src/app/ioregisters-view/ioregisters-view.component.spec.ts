import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IoregistersViewComponent } from './ioregisters-view.component';

describe('IoregistersViewComponent', () => {
  let component: IoregistersViewComponent;
  let fixture: ComponentFixture<IoregistersViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IoregistersViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IoregistersViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
