// Port of C# Tag.cs — pure logic, no DOM.

import {
  TagSubsection,
  TagSubsectionType,
  AlphaTagSubsection,
  NumericTagSubsection,
  InvalidTagException,
  InvalidTagFormatException,
} from './subsections';

export class Tag {
  private readonly _sections: TagSubsection[];
  private readonly _format: string;

  constructor(tag: string, format: string) {
    this._format = format;
    this._sections = [];

    if (tag.length !== format.length)
      throw new InvalidTagException(`Invalid tag '${tag}' does not match format, aborting`, format);

    let buf = [tag[0]];

    for (let i = 1; i < format.length; i++) {
      if (format[i] === format[i - 1]) {
        buf.push(tag[i]);
      } else {
        this._sections.push(Tag._makeSection(buf, format[i - 1]));
        buf = [tag[i]];
      }
    }
    this._sections.push(Tag._makeSection(buf, format[format.length - 1]));
  }

  private static _makeSection(chars: string[], formatChar: string): TagSubsection {
    if (formatChar === '#') return new NumericTagSubsection(chars, TagSubsectionType.Loop);
    if (formatChar === 'C') return new AlphaTagSubsection(chars, TagSubsectionType.Instrument);
    if (formatChar === 'U') return new NumericTagSubsection(chars, TagSubsectionType.Unit);
    throw new InvalidTagFormatException(`${formatChar} is not a valid tag format char`);
  }

  private _cloneSections(): TagSubsection[] {
    return this._sections.map(s => s.clone());
  }

  private _rebuild(sections: TagSubsection[]): Tag {
    return new Tag(sections.map(s => s.toString()).join(''), this._format);
  }

  getNextTag(): Tag {
    const sections = this._cloneSections();
    const loop = sections.find(s => s.getSubsectionType() === TagSubsectionType.Loop);
    const instrument = sections.find(s => s.getSubsectionType() === TagSubsectionType.Instrument);
    const unit = sections.find(s => s.getSubsectionType() === TagSubsectionType.Unit);

    // Carry: loop → instrument → unit (mirrors C# logic exactly)
    if (loop != null && loop.increment())
      if (instrument == null || instrument.increment())
        if (unit != null) unit.increment();

    return this._rebuild(sections);
  }

  getPreviousTag(): Tag {
    const sections = this._cloneSections();
    const loop = sections.find(s => s.getSubsectionType() === TagSubsectionType.Loop);
    const instrument = sections.find(s => s.getSubsectionType() === TagSubsectionType.Instrument);
    const unit = sections.find(s => s.getSubsectionType() === TagSubsectionType.Unit);

    if (loop != null && loop.decrement())
      if (instrument == null || instrument.decrement())
        if (unit != null) unit.decrement();

    return this._rebuild(sections);
  }

  getMaxLoopTag(): Tag {
    const sections = this._cloneSections();
    sections.find(s => s.getSubsectionType() === TagSubsectionType.Loop)?.toMaximumSection();
    return this._rebuild(sections);
  }

  getMinLoopTag(): Tag {
    const sections = this._cloneSections();
    sections.find(s => s.getSubsectionType() === TagSubsectionType.Loop)?.toMinimumSection();
    return this._rebuild(sections);
  }

  getMinTag(): Tag {
    const sections = this._cloneSections();
    for (const s of sections) s.toMinimumSection();
    return this._rebuild(sections);
  }

  getMaxTag(): Tag {
    const sections = this._cloneSections();
    for (const s of sections) s.toMaximumSection();
    return this._rebuild(sections);
  }

  toString(): string {
    return this._sections.map(s => s.toString()).join('');
  }

  getUnitSection(): string {
    return this._sections.find(s => s.getSubsectionType() === TagSubsectionType.Unit)?.toString() ?? '';
  }

  getInstrumentSection(): string {
    return this._sections.find(s => s.getSubsectionType() === TagSubsectionType.Instrument)?.toString() ?? '';
  }

  getLoopSection(): string {
    return this._sections.find(s => s.getSubsectionType() === TagSubsectionType.Loop)?.toString() ?? '';
  }

  /** Compare by unit → instrument → loop. Returns exactly -1, 0, or 1. */
  compareTo(other: Tag): -1 | 0 | 1 {
    const cmp = (a: string, b: string): -1 | 0 | 1 => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    };
    let r = cmp(this.getUnitSection(), other.getUnitSection());
    if (r !== 0) return r;
    r = cmp(this.getInstrumentSection(), other.getInstrumentSection());
    if (r !== 0) return r;
    return cmp(this.getLoopSection(), other.getLoopSection());
  }

  /**
   * Count of tags from this to other (inclusive). The positional difference is computed
   * over the concatenated unit+instrument+loop string using mixed-radix arithmetic where
   * letter positions have radix 26 and digit positions have radix 10.
   */
  getLoopCount(other: Tag): string {
    const cmp = this.compareTo(other);
    if (cmp === 0) return '1';

    let smallTag: string;
    let largeTag: string;

    const thisConcat = this.getUnitSection() + this.getInstrumentSection() + this.getLoopSection();
    const otherConcat = other.getUnitSection() + other.getInstrumentSection() + other.getLoopSection();

    if (cmp === -1) {
      smallTag = thisConcat;
      largeTag = otherConcat;
    } else {
      smallTag = otherConcat;
      largeTag = thisConcat;
    }

    if (smallTag.length !== largeTag.length)
      throw new Error('Tag formats do not match Cannot get loop count');

    let result = 0;
    for (let i = 0; i < smallTag.length; i++) {
      const sc = smallTag[i];
      const lc = largeTag[i];
      if (lc === sc) continue;

      let difference = lc.charCodeAt(0) - sc.charCodeAt(0);
      for (let j = i + 1; j < smallTag.length; j++) {
        const c = smallTag[j];
        difference *= (c >= '0' && c <= '9') ? 10 : 26;
      }
      result += difference;
    }

    return (result + 1).toString();
  }
}

/** Sort comparator for Tag arrays: unit → instrument → loop. */
export function compareTag(a: Tag, b: Tag): number {
  return a.compareTo(b);
}
