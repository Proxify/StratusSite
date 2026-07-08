// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { processHtmContent, processFiles } from '@/lib/littledrop/cond-cp-replace';
import type { ReplaceConfig } from '@/lib/littledrop/cond-cp-replace';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal HTM fragment with a single DIV containing parameters */
function makeHtm(params: string): string {
  return `<HTML><BODY>\n<DIV id="shape1" parameters="${params}" style="position:absolute">\n</BODY></HTML>`;
}

const BASE_CONFIG: ReplaceConfig = {
  cond1: { cpName: 'LOOP_NAME', condition: 'Contains', cpParam: 'REACTOR' },
  changeCPName: 'SOURCE_TAG',
  changeCPParam: 'NEW_TAG',
};

// ---------------------------------------------------------------------------
// Match found — basic condition
// ---------------------------------------------------------------------------

describe('processHtmContent — match found', () => {
  it('replaces the target CP value when the condition is met', () => {
    const htm = makeHtm('LOOP_NAME:REACTOR_01;SOURCE_TAG:OLD_TAG;');
    const { changed, replacements, content } = processHtmContent(htm, BASE_CONFIG);

    expect(changed).toBe(true);
    expect(replacements).toBe(1);
    expect(content).toContain('SOURCE_TAG:NEW_TAG;');
    expect(content).not.toContain('SOURCE_TAG:OLD_TAG;');
  });

  it('handles Equals condition', () => {
    const config: ReplaceConfig = {
      cond1: { cpName: 'LOOP_NAME', condition: 'Equals', cpParam: 'REACTOR_01' },
      changeCPName: 'SOURCE_TAG',
      changeCPParam: 'NEW_TAG',
    };
    const htm = makeHtm('LOOP_NAME:REACTOR_01;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, config);
    expect(changed).toBe(true);
  });

  it('handles Exists condition (cpParam ignored)', () => {
    const config: ReplaceConfig = {
      cond1: { cpName: 'LOOP_NAME', condition: 'Exists', cpParam: '' },
      changeCPName: 'SOURCE_TAG',
      changeCPParam: 'NEW_TAG',
    };
    const htm = makeHtm('LOOP_NAME:ANYTHING;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, config);
    expect(changed).toBe(true);
  });

  it('handles key with ? prefix (strips up to and including ?)', () => {
    // C# strips "ATTR?" from key, leaving "LOOP_NAME"
    const htm = makeHtm('ATTR?LOOP_NAME:REACTOR_01;SOURCE_TAG:OLD_TAG;');
    const config: ReplaceConfig = {
      cond1: { cpName: 'LOOP_NAME', condition: 'Equals', cpParam: 'REACTOR_01' },
      changeCPName: 'SOURCE_TAG',
      changeCPParam: 'NEW_TAG',
    };
    const { changed } = processHtmContent(htm, config);
    expect(changed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No match — condition false
// ---------------------------------------------------------------------------

describe('processHtmContent — no match', () => {
  it('does not modify content when condition is not met', () => {
    const htm = makeHtm('LOOP_NAME:PUMP_01;SOURCE_TAG:OLD_TAG;');
    const { changed, replacements, content } = processHtmContent(htm, BASE_CONFIG);

    expect(changed).toBe(false);
    expect(replacements).toBe(0);
    expect(content).toBe(htm); // unchanged
  });

  it('Does Not Contain passes when value does not contain param', () => {
    const config: ReplaceConfig = {
      cond1: { cpName: 'LOOP_NAME', condition: 'Does Not Contain', cpParam: 'REACTOR' },
      changeCPName: 'SOURCE_TAG',
      changeCPParam: 'NEW_TAG',
    };
    const htm = makeHtm('LOOP_NAME:PUMP_01;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, config);
    expect(changed).toBe(true); // condition is met (does NOT contain REACTOR)
  });

  it('Does Not Contain fails when value contains param', () => {
    const config: ReplaceConfig = {
      cond1: { cpName: 'LOOP_NAME', condition: 'Does Not Contain', cpParam: 'REACTOR' },
      changeCPName: 'SOURCE_TAG',
      changeCPParam: 'NEW_TAG',
    };
    const htm = makeHtm('LOOP_NAME:REACTOR_01;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, config);
    expect(changed).toBe(false); // condition NOT met (does contain REACTOR)
  });

  it('Does Not Equal passes when values differ', () => {
    const config: ReplaceConfig = {
      cond1: { cpName: 'LOOP_NAME', condition: 'Does Not Equal', cpParam: 'REACTOR_01' },
      changeCPName: 'SOURCE_TAG',
      changeCPParam: 'NEW_TAG',
    };
    const htm = makeHtm('LOOP_NAME:PUMP_01;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, config);
    expect(changed).toBe(true);
  });

  it('does not change files where changeCPName is absent from the block', () => {
    // Condition matches but the target CP name is not present in the block
    const htm = makeHtm('LOOP_NAME:REACTOR_01;OTHER_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, BASE_CONFIG);
    expect(changed).toBe(false);
  });

  it('does not modify when CP key is absent from parameters', () => {
    const htm = makeHtm('OTHER_KEY:REACTOR_01;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, BASE_CONFIG);
    expect(changed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Conditional rules — And / Or combinator
// ---------------------------------------------------------------------------

describe('processHtmContent — And / Or rules', () => {
  const andConfig: ReplaceConfig = {
    cond1: { cpName: 'LOOP_NAME', condition: 'Contains', cpParam: 'REACTOR' },
    andOr: 'And',
    cond2: { cpName: 'UNIT', condition: 'Equals', cpParam: 'U01' },
    changeCPName: 'SOURCE_TAG',
    changeCPParam: 'NEW_TAG',
  };

  it('And — both conditions met → replaces', () => {
    const htm = makeHtm('LOOP_NAME:REACTOR_01;UNIT:U01;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, andConfig);
    expect(changed).toBe(true);
  });

  it('And — only first condition met → no change', () => {
    const htm = makeHtm('LOOP_NAME:REACTOR_01;UNIT:U02;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, andConfig);
    expect(changed).toBe(false);
  });

  it('And — only second condition met → no change', () => {
    const htm = makeHtm('LOOP_NAME:PUMP_01;UNIT:U01;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, andConfig);
    expect(changed).toBe(false);
  });

  it('Or — only first condition met → replaces', () => {
    const orConfig: ReplaceConfig = { ...andConfig, andOr: 'Or' };
    const htm = makeHtm('LOOP_NAME:REACTOR_01;UNIT:U99;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, orConfig);
    expect(changed).toBe(true);
  });

  it('Or — neither condition met → no change', () => {
    const orConfig: ReplaceConfig = { ...andConfig, andOr: 'Or' };
    const htm = makeHtm('LOOP_NAME:PUMP_01;UNIT:U99;SOURCE_TAG:OLD_TAG;');
    const { changed } = processHtmContent(htm, orConfig);
    expect(changed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multiple files
// ---------------------------------------------------------------------------

describe('processFiles — multiple files', () => {
  it('processes each file independently', () => {
    const files = [
      { fileName: 'graphic1.htm', content: makeHtm('LOOP_NAME:REACTOR_01;SOURCE_TAG:OLD_TAG;') },
      { fileName: 'graphic2.htm', content: makeHtm('LOOP_NAME:PUMP_01;SOURCE_TAG:OLD_TAG;') },
      { fileName: 'graphic3.htm', content: makeHtm('LOOP_NAME:REACTOR_FEED;SOURCE_TAG:OLD_TAG;') },
    ];

    const results = processFiles(files, BASE_CONFIG);

    expect(results).toHaveLength(3);
    expect(results[0].changed).toBe(true);  // REACTOR_01 contains REACTOR
    expect(results[1].changed).toBe(false); // PUMP_01 does not
    expect(results[2].changed).toBe(true);  // REACTOR_FEED contains REACTOR
  });

  it('preserves unchanged file content verbatim', () => {
    const content = makeHtm('LOOP_NAME:PUMP_01;SOURCE_TAG:OLD_TAG;');
    const [result] = processFiles([{ fileName: 'g.htm', content }], BASE_CONFIG);
    expect(result.modifiedContent).toBe(content);
  });

  it('returns correct fileName for each result', () => {
    const files = [
      { fileName: 'a.htm', content: makeHtm('') },
      { fileName: 'b.htm', content: makeHtm('') },
    ];
    const results = processFiles(files, BASE_CONFIG);
    expect(results.map((r) => r.fileName)).toEqual(['a.htm', 'b.htm']);
  });

  it('handles INPUT and TEXTAREA blocks in addition to DIV', () => {
    const htm =
      '<HTML><BODY>' +
      '<INPUT name="pb1" parameters="LOOP_NAME:REACTOR_01;SOURCE_TAG:OLD_TAG;" />' +
      '<TEXTAREA parameters="LOOP_NAME:PUMP_01;SOURCE_TAG:OLD_TAG;" />' +
      '</BODY></HTML>';
    const { changed, replacements } = processHtmContent(htm, BASE_CONFIG);
    expect(changed).toBe(true);
    expect(replacements).toBe(1); // Only the INPUT block matches
  });
});
