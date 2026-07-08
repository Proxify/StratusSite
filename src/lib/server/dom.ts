/**
 * Server-side DOMParser shim.
 *
 * The HMI (.htm) and DeltaV (.ahc) parsers are written against the browser
 * DOMParser/querySelector APIs. jsdom supplies identical semantics to the
 * vitest jsdom environment the parser test suites already validate against.
 *
 * Import this module (for its side effect) at the top of any API route that
 * calls parseHMIFile / parseDVFile / loadGemLibrary.
 */
import { JSDOM } from 'jsdom';

if (typeof globalThis.DOMParser === 'undefined') {
  const { DOMParser } = new JSDOM().window;
  globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;
}
