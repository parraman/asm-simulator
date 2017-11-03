import { TestBed, inject } from '@angular/core/testing';

import { ErrorBarService } from './error-bar.service';

describe('ErrorBarService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorBarService]
    });
  });

  it('should be created', inject([ErrorBarService], (service: ErrorBarService) => {
    expect(service).toBeTruthy();
  }));
});
