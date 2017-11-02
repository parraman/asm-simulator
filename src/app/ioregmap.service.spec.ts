import { TestBed, inject } from '@angular/core/testing';

import { IORegMapService } from './ioregmap.service';

describe('IoregmapService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IORegMapService]
    });
  });

  it('should be created', inject([IORegMapService], (service: IORegMapService) => {
    expect(service).toBeTruthy();
  }));
});
