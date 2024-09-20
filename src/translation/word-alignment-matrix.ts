export class WordAlignmentMatrix {
  private matrix: boolean[][] = [];

  constructor(
    public readonly rowCount: number,
    public readonly columnCount: number,
    setValues: Iterable<[number, number]> = [],
  ) {
    this.setAll(false);
    for (const [i, j] of setValues) {
      this.set(i, j, true);
    }
  }

  setAll(value: boolean): void {
    this.matrix = new Array<boolean[]>(this.rowCount);
    for (let i = 0; i < this.matrix.length; i++) {
      this.matrix[i] = new Array<boolean>(this.columnCount).fill(value);
    }
  }

  set(i: number, j: number, value: boolean): void {
    if (i >= this.rowCount) {
      throw new Error('i is out of range.');
    }
    if (j >= this.columnCount) {
      throw new Error('j is out of range.');
    }
    this.matrix[i][j] = value;
  }

  get(i: number, j: number): boolean {
    return this.matrix[i][j];
  }

  getRowAlignedIndices(i: number): number[] {
    const indices: number[] = [];
    for (let j = 0; j < this.columnCount; j++) {
      if (this.matrix[i][j]) {
        indices.push(j);
      }
    }
    return indices;
  }

  getColumnAlignedIndices(j: number): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.rowCount; i++) {
      if (this.matrix[i][j]) {
        indices.push(i);
      }
    }
    return indices;
  }
}
