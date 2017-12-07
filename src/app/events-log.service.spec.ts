import { TestBed, inject } from '@angular/core/testing';

import { EventsLogService } from './events-log.service';

describe('EventsLogService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventsLogService]
    });
  });

  it('should be created', inject([EventsLogService], (service: EventsLogService) => {
    expect(service).toBeTruthy();
  }));
});
