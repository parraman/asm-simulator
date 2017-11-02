import { TestBed, inject } from '@angular/core/testing';

import {MemoryOperation, MemoryService, MemoryCellType} from './memory.service';
import {EventEmitter} from '@angular/core';

describe('MemoryService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MemoryService]
    });
  });

  it('should be created', inject([MemoryService], (service: MemoryService) => {
    expect(service).toBeTruthy();
  }));

  it('add memory region', inject([MemoryService], (service: MemoryService) => {

    const emitter = new EventEmitter<MemoryOperation>();
    const createRegion = function(startAddress: number, endAddress: number) {
      service.addMemoryRegion(startAddress, endAddress, emitter, MemoryCellType.READ_WRITE);
    };
    let region = service.addMemoryRegion(10, 800, emitter, MemoryCellType.READ_WRITE, );
    expect(region).toBeTruthy();
    expect(region.size === 791).toBeTruthy();

    expect(function() { createRegion(0, 100); }).toThrowError();
    expect(function() { createRegion(0, 800); }).toThrowError();
    expect(function() { createRegion(0, 801); }).toThrowError();
    expect(function() { createRegion(10, 800); }).toThrowError();
    expect(function() { createRegion(10, 801); }).toThrowError();
    expect(function() { createRegion(20, 800); }).toThrowError();
    expect(function() { createRegion(800, 801); }).toThrowError();
    expect(function() { createRegion(20, 1000); }).toThrowError();
    expect(function() { createRegion(801, 1024); }).toThrowError();
    expect(function() { createRegion(801, 801); }).toThrowError();

    region = service.addMemoryRegion(801, 1023, emitter, MemoryCellType.READ_WRITE);
    expect(region).toBeTruthy();

  }));
});
