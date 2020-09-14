export class TopNValues {
  private limit: number;
  private data: number[] = [];

  constructor(limit: number) {
    this.limit = limit;
  }

  addValue(value: number): boolean {
    let result: Boolean = false;

    if (this.data.length < this.limit) {
      this.data.push(value);
      result = true;
    } else {
      if (this.data[0] < value) {
        this.data.shift();
        this.data.push(value);
      }
    }

    this.data = this.data.sort((a, b) => a - b);

    return true;
  }

  getValue(percentile: number): number {
    if (!this.data.length) {
      return NaN;
    }
    const index = Math.floor((percentile / 100) * (this.data.length - 1));

    const val = this.data[index];
    return val;
  }
}
