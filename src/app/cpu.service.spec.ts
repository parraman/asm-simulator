import { TestBed, inject } from '@angular/core/testing';

import { CPUService } from './cpu.service';

describe('CPUService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CPUService]
    });
  });

  it('should be created', inject([CPUService], (service: CPUService) => {
    expect(service).toBeTruthy();
  }));
});
