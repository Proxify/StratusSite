// Port of C# TagListBuilder.cs + AvailableTagInfo.cs — pure logic, no DOM.

import { Tag, compareTag } from './tag';

export interface AvailableTagInfo {
  availableTagRange: string;
  range: string;
  unit: string;
  firstInstrument: string;
  loopCount: string;
}

export interface AvailableTagResult {
  allTags: AvailableTagInfo[];
  byInstrument: AvailableTagInfo[];
  unique: AvailableTagInfo[];
}

// ---------------------------------------------------------------------------
// Tag extraction from raw text (mirrors AvailableTags.GetTagRegex / Execute)
// ---------------------------------------------------------------------------

/**
 * Build a regex that matches tags at the start of a line per the given format.
 * Format chars: U=digit (unit), C=alpha letter (instrument), #=digit (loop).
 */
export function buildTagRegex(tagFormat: string): RegExp {
  const pattern =
    '^' +
    tagFormat
      .split('')
      .map(c => {
        if (c === 'U' || c === '#') return '\\d';
        if (c === 'C') return '[a-zA-Z]';
        throw new Error(`Unknown format character: '${c}'`);
      })
      .join('');
  return new RegExp(pattern, 'gm');
}

/** Extract all tags from file text that match the format. Returns deduplicated set. */
export function extractTagsFromText(text: string, tagFormat: string): string[] {
  const regex = buildTagRegex(tagFormat);
  const seen = new Set<string>();
  for (const m of text.matchAll(regex)) seen.add(m[0].toUpperCase());
  return Array.from(seen);
}

// ---------------------------------------------------------------------------
// TagListBuilder — three list variants
// ---------------------------------------------------------------------------

/** Build full tag list sorted by unit → instrument → loop. */
export function buildTagListForAvailableTagTable(rawTags: Iterable<string>, tagFormat: string): Tag[] {
  const tags = Array.from(rawTags).map(t => new Tag(t, tagFormat));
  tags.sort(compareTag);
  return tags;
}

/**
 * Collapse multi-char instrument to single char, dedup, sort.
 * Port of BuildTagListForInstrumentAvailableTagTable.
 */
export function buildTagListForInstrumentAvailableTagTable(rawTags: Iterable<string>, tagFormat: string): Tag[] {
  const firstIndex = tagFormat.indexOf('C');

  if (firstIndex === -1) {
    // No instrument section — identical to full list
    return buildTagListForAvailableTagTable(rawTags, tagFormat);
  }

  const lastIndex = tagFormat.lastIndexOf('C'); // always >= firstIndex since firstIndex > -1
  // Keep only the first C in the format; drop characters between first and last C
  const instrumentTagFormat = tagFormat.slice(0, firstIndex + 1) + tagFormat.slice(lastIndex + 1);

  const rawTagSet = new Set<string>();
  for (const rawTag of rawTags) {
    rawTagSet.add(rawTag.slice(0, firstIndex + 1) + rawTag.slice(lastIndex + 1));
  }

  const tags = Array.from(rawTagSet).map(t => new Tag(t, instrumentTagFormat));
  tags.sort(compareTag);
  return tags;
}

/**
 * Strip all alpha characters from tags and format, dedup, sort.
 * Port of BuildTagListForUniqueAvailableTagTable.
 */
export function buildTagListForUniqueAvailableTagTable(rawTags: Iterable<string>, tagFormat: string): Tag[] {
  const uniqueFormat = tagFormat.replace(/[Cc]/g, '');
  const tagSet = new Set<string>();
  for (const rawTag of rawTags) tagSet.add(rawTag.replace(/[^0-9]/g, ''));

  const tags = Array.from(tagSet).map(t => new Tag(t, uniqueFormat));
  tags.sort(compareTag);
  return tags;
}

// ---------------------------------------------------------------------------
// Gap finder — BuildAvailableTagList
// ---------------------------------------------------------------------------

/** Given a sorted tag list, generates the available (unused) ranges between tags. */
export function buildAvailableTagList(tagList: Tag[]): AvailableTagInfo[] {
  const result: AvailableTagInfo[] = [];
  const first = tagList[0];
  const last = tagList[tagList.length - 1];

  // Gap before the first tag (from absolute min to first-1)
  if (first.getMinTag().toString() !== first.toString())
    result.push(extrapolateTagInfo(first.getMinTag(), first.getPreviousTag()));

  for (let i = 0; i < tagList.length - 1; i++) {
    const cur = tagList[i];
    const next = tagList[i + 1];
    const curInc = cur.getNextTag();
    const nextDec = next.getPreviousTag();

    if (curInc.toString() === next.toString()) continue; // adjacent, no gap

    // Does the gap cross a loop-group boundary? (i.e., does curInc max its loop before nextDec)
    if (curInc.getMaxLoopTag().compareTo(nextDec) < 0) {
      // Cross-boundary: emit three sub-ranges
      result.push(extrapolateTagInfo(curInc, curInc.getMaxLoopTag()));

      // Middle ranges spanning full instrument/unit groups
      const midStart = curInc.getMaxLoopTag().getNextTag();
      const midEnd = nextDec.getMinLoopTag().getPreviousTag();
      if (midStart.compareTo(midEnd) < 0)
        result.push(extrapolateTagInfo(midStart, midEnd));

      result.push(extrapolateTagInfo(nextDec.getMinLoopTag(), nextDec));
    } else {
      // Simple gap within the same instrument group
      result.push(extrapolateTagInfo(curInc, nextDec));
    }
  }

  // Gap after last tag within same loop group (last+1 to maxLoop)
  if (last.getMaxLoopTag().toString() !== last.toString())
    result.push(extrapolateTagInfo(last.getNextTag(), last.getMaxLoopTag()));

  // Gap from maxLoop to absolute maximum (crosses instrument/unit boundaries)
  if (last.getMaxLoopTag().compareTo(last.getMaxTag()) !== 0)
    result.push(extrapolateTagInfo(last.getMaxLoopTag().getNextTag(), last.getMaxTag()));

  return result;
}

function extrapolateTagInfo(tag1: Tag, tag2: Tag): AvailableTagInfo {
  if (tag1.compareTo(tag2) === 0) {
    const inst = tag1.getInstrumentSection();
    return {
      availableTagRange: tag1.toString(),
      unit: "'" + tag1.getUnitSection(),
      firstInstrument: inst,
      range: tag1.getLoopSection(),
      loopCount: '1',
    };
  }

  const inst1 = tag1.getInstrumentSection();
  const inst2 = tag2.getInstrumentSection();
  const u1 = tag1.getUnitSection();
  const u2 = tag2.getUnitSection();

  const base: Pick<AvailableTagInfo, 'availableTagRange' | 'loopCount'> = {
    availableTagRange: `${tag1.toString()}-${tag2.toString()}`,
    loopCount: tag1.getLoopCount(tag2),
  };

  if (u1 !== u2) {
    return { ...base, unit: `'${u1}-${u2}`, firstInstrument: 'n/a', range: 'n/a' };
  }

  if (inst1.length > 0 && inst1 !== inst2) {
    return { ...base, unit: `'${u1}`, firstInstrument: `${inst1}-${inst2}`, range: 'n/a' };
  }

  return {
    ...base,
    unit: `'${u1}`,
    firstInstrument: inst1,
    range: `${tag1.getLoopSection()}-${tag2.getLoopSection()}`,
  };
}

// ---------------------------------------------------------------------------
// Convenience: run all three analyses on a set of raw tags
// ---------------------------------------------------------------------------

export function buildAllTagLists(rawTags: string[], tagFormat: string): AvailableTagResult {
  if (rawTags.length === 0) return { allTags: [], byInstrument: [], unique: [] };

  const forAll = buildTagListForAvailableTagTable(rawTags, tagFormat);
  const forInstrument = buildTagListForInstrumentAvailableTagTable(rawTags, tagFormat);
  const forUnique = buildTagListForUniqueAvailableTagTable(rawTags, tagFormat);

  return {
    allTags: forAll.length > 0 ? buildAvailableTagList(forAll) : [],
    byInstrument: forInstrument.length > 0 ? buildAvailableTagList(forInstrument) : [],
    unique: forUnique.length > 0 ? buildAvailableTagList(forUnique) : [],
  };
}
