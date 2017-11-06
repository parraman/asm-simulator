import { TestBed, inject } from '@angular/core/testing';

import { IrqCtrlService } from './irqctrl.service';

describe('IrqCtrlService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IrqCtrlService]
    });
  });

  it('should be created', inject([IrqCtrlService], (service: IrqCtrlService) => {
    expect(service).toBeTruthy();
  }));
});
