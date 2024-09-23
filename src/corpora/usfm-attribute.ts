export class UsfmAttribute {
  constructor(
    public readonly name: string,
    public readonly value: string,
    public readonly offset = 0,
  ) {}

  toString(): string {
    return `${this.name}="${this.value}"`;
  }
}
