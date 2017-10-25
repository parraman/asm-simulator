import { Injectable } from '@angular/core';

@Injectable()
export class MemoryService {

  public data: Array<number>;

  public size = 1024;

  public lastAccess = -1;

  constructor() {

    this.data = new Array(this.size);

  }

  public setMemorySize(size: number): Array<number> {

    this.lastAccess = -1;
    this.size = size;
    this.data = new Array(this.size);

    return this.data;

  }

  public load(address: number): number {

    if (address < 0 || address > this.size) {
      throw Error('Memory access violation at ' + address);
    }

    this.lastAccess = address;
    return this.data[address];

  }

  public store(address: number, value: number) {

    if (address < 0 || address > this.size) {
      throw Error('Memory access violation at ' + address);
    }

    if (value < 0 || value > 255) {
      throw Error('Invalid data value ' + value);
    }

    this.lastAccess = address;
    this.data[address] = value;

  }

  public reset() {

    this.lastAccess = -1;

    for (let i = 0; i < this.data.length; i++) {

      this.data[i] = 0;

    }

  }

}
