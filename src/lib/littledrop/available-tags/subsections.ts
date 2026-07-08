// Pure tag subsection logic — no DOM, no I/O. Port of C# TagSubsection hierarchy.

export enum TagSubsectionType {
  Unit = 'Unit',
  Instrument = 'Instrument',
  Loop = 'Loop',
}

export class InvalidTagException extends Error {
  readonly validFormat: string;
  constructor(message: string, format: string) {
    super(message);
    this.name = 'InvalidTagException';
    this.validFormat = format;
  }
}

export class InvalidTagFormatException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTagFormatException';
  }
}

// Pass min/max as constructor args to avoid prototype-chain timing issues
// (TS class field initializers run after super(), unlike C# abstract properties).
export abstract class TagSubsection {
  protected readonly _min: string;
  protected readonly _max: string;
  protected readonly _lastIndex: number;
  protected _section: string[];
  readonly subsectionType: TagSubsectionType;

  constructor(section: string[], type: TagSubsectionType, min: string, max: string) {
    this._min = min;
    this._max = max;
    this._section = section;
    this._lastIndex = section.length - 1;
    this.subsectionType = type;

    const minCode = min.charCodeAt(0);
    const maxCode = max.charCodeAt(0);
    if (!section.every(c => { const code = c.charCodeAt(0); return code >= minCode && code <= maxCode; })) {
      throw new InvalidTagException(`Illegal character found in tag '${section.join('')}'`, '');
    }
  }

  /** Returns true if overflow occurred (wrapped around). Mutates in place. */
  increment(): boolean {
    const maxCode = this._max.charCodeAt(0);
    const minCode = this._min.charCodeAt(0);
    for (let i = this._lastIndex; i >= 0; i--) {
      const next = this._section[i].charCodeAt(0) + 1;
      if (next > maxCode) {
        this._section[i] = this._min;
      } else {
        this._section[i] = String.fromCharCode(next);
        return false;
      }
    }
    return true;
  }

  /** Returns true if underflow occurred (wrapped around). Mutates in place. */
  decrement(): boolean {
    const minCode = this._min.charCodeAt(0);
    const maxCode = this._max.charCodeAt(0);
    for (let i = this._lastIndex; i >= 0; i--) {
      const prev = this._section[i].charCodeAt(0) - 1;
      if (prev < minCode) {
        this._section[i] = this._max;
      } else {
        this._section[i] = String.fromCharCode(prev);
        return false;
      }
    }
    return true;
  }

  toMaximumSection(): void {
    for (let i = this._lastIndex; i >= 0; i--) this._section[i] = this._max;
  }

  toMinimumSection(): void {
    for (let i = this._lastIndex; i >= 0; i--) this._section[i] = this._min;
  }

  toString(): string {
    return this._section.join('');
  }

  getSubsectionType(): TagSubsectionType {
    return this.subsectionType;
  }

  abstract clone(): TagSubsection;
}

export class AlphaTagSubsection extends TagSubsection {
  constructor(section: string[], type: TagSubsectionType) {
    // toUpperCase matches C# `: base(new String(section).ToUpper().ToCharArray(), type)`
    super(section.map(c => c.toUpperCase()), type, 'A', 'Z');
  }

  clone(): AlphaTagSubsection {
    return new AlphaTagSubsection([...this._section], this.subsectionType);
  }
}

export class NumericTagSubsection extends TagSubsection {
  constructor(section: string[], type: TagSubsectionType) {
    super([...section], type, '0', '9');
  }

  clone(): NumericTagSubsection {
    return new NumericTagSubsection([...this._section], this.subsectionType);
  }
}
