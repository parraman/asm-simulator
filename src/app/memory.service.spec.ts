import { TestBed, inject } from '@angular/core/testing';

import { MemoryService } from './memory.service';

describe('MemoryService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MemoryService]
    });
  });

  it('should be created', inject([MemoryService], (service: MemoryService) => {
    expect(service).toBeTruthy();
  }));
});
