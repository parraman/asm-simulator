import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EventsLogViewerComponent } from './events-log-viewer.component';

describe('EventsLogViewerComponent', () => {
  let component: EventsLogViewerComponent;
  let fixture: ComponentFixture<EventsLogViewerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EventsLogViewerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EventsLogViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
