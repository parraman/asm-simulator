import { TestBed, inject } from '@angular/core/testing';

import { AssemblerService } from './assembler.service';

describe('AssemblerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AssemblerService]
    });
  });

  it('should be created', inject([AssemblerService], (service: AssemblerService) => {
    expect(service).toBeTruthy();
  }));
});
