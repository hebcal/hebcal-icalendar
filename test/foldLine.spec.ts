import {expect, test} from 'vitest';
import {foldLine} from '../src/foldLine';
import {Buffer} from 'node:buffer';

test('fold-ascii-short', () => {
  const str = 'SUMMARY:Rum Rebellion Day';
  expect(foldLine(str)).toEqual(str);
});

test('fold-non-ascii-short', () => {
  const str = 'SUMMARY:Ĥéļļö Ŵöŕļđ';
  expect(foldLine(str)).toEqual(str);
});

test('fold-ascii-long', () => {
  const str = 'SUMMARY:' + 'Foo'.repeat(50);
  expect(foldLine(str)).toEqual(
    'SUMMARY:FooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFoo\r\n FooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFooFo\r\n oFooFooFoo'
  );
});

test('fold-non-ascii', () => {
  const str = 'SUMMARY:🏴󠁧󠁢󠁳󠁣󠁴󠁿 Burns Night 🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  const actual = foldLine(str);
  expect(actual).toEqual('SUMMARY:🏴󠁧󠁢󠁳󠁣󠁴󠁿 Burns Night \r\n 🏴󠁧󠁢󠁳󠁣󠁴󠁿');
});

test('fold-hebrew-long', () => {
  const str =
    'SUMMARY:בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹקִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ';
  const actual = foldLine(str);
  expect(actual).toEqual(
    'SUMMARY:בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹקִ֑ים אֵ֥\r\n ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ'
  );
});

test('fold-latin1-long', () => {
  // Codepoints in U+0080..U+00FF each encode to two UTF-8 bytes;
  // the folded chunks must not exceed 75 octets.
  const str = 'SUMMARY:' + 'é'.repeat(60);
  const folded = foldLine(str);
  for (const chunk of folded.split('\r\n ')) {
    expect(Buffer.byteLength(chunk)).toBeLessThanOrEqual(75);
  }
  // Round-trip: unfolding restores the original.
  expect(folded.split('\r\n ').join('')).toEqual(str);
});

test('fold-flag-emoji', () => {
  // 🇮🇱 is two regional-indicator code points (8 UTF-8 bytes) that must
  // stay together as a single grapheme cluster across folds.
  const str = 'SUMMARY:Hello ' + '🇮🇱 Israel '.repeat(20);
  const folded = foldLine(str);
  for (const chunk of folded.split('\r\n ')) {
    expect(Buffer.byteLength(chunk)).toBeLessThanOrEqual(75);
  }
  expect(folded.split('\r\n ').join('')).toEqual(str);
  // The flag is never split across a fold boundary.
  expect(folded).not.toContain('🇮\r\n');
  expect(folded).not.toContain('\r\n 🇱');
});

test('fold-ascii-long-with-newlines', () => {
  // `.` in a JS regex does not match \r or \n, so folding an all-ASCII line
  // with a /.{1,74}/g regex silently drops those characters.
  const str = 'DESCRIPTION:' + 'a'.repeat(70) + '\n' + 'b'.repeat(70);
  const folded = foldLine(str);
  expect(folded.split('\r\n ').join('')).toEqual(str);
});

test('fold-ascii-only-line-terminators', () => {
  // Same root cause: a long all-ASCII line made up entirely of line
  // terminators has no `.` matches at all.
  const str = '\r\n'.repeat(80);
  const folded = foldLine(str);
  expect(folded.split('\r\n ').join('')).toEqual(str);
  for (const chunk of folded.split('\r\n ')) {
    expect(Buffer.byteLength(chunk)).toBeLessThanOrEqual(75);
  }
});

test('fold-hebrew-nikud-keeps-marks-with-base', () => {
  // Hebrew points are combining marks; a fold must never orphan one at the
  // start of a continuation line.
  const str = 'DESCRIPTION:' + 'בְּרֵאשִׁ֖ית בָּרָ֣א '.repeat(6);
  const folded = foldLine(str);
  expect(folded.split('\r\n ').join('')).toEqual(str);
  for (const chunk of folded.split('\r\n ')) {
    expect(Buffer.byteLength(chunk)).toBeLessThanOrEqual(75);
  }
  for (const chunk of folded.split('\r\n ').slice(1)) {
    // no continuation line begins with a combining mark
    expect(/^[֑-ׇֽֿׁׂׅׄ]/.test(chunk)).toBe(false);
  }
});

test('fold-zwj-emoji-sequence', () => {
  // 👨‍👩‍👧‍👦 is four emoji joined by ZWJ: one grapheme cluster, 25 octets.
  const str = 'SUMMARY:' + '👨‍👩‍👧‍👦 family '.repeat(8);
  const folded = foldLine(str);
  expect(folded.split('\r\n ').join('')).toEqual(str);
  for (const chunk of folded.split('\r\n ')) {
    expect(Buffer.byteLength(chunk)).toBeLessThanOrEqual(75);
  }
  // never break immediately before or after a ZWJ
  expect(folded).not.toContain('‍\r\n ');
  expect(folded).not.toContain('\r\n ‍');
});

test('fold-single-cluster-longer-than-limit', () => {
  // One base character plus 200 combining marks is a single grapheme
  // cluster far wider than 75 octets. It has to be split somewhere, but
  // every chunk must still respect the octet limit and round-trip.
  const str = 'a' + '֑'.repeat(200);
  const folded = foldLine(str);
  expect(folded.split('\r\n ').join('')).toEqual(str);
  for (const chunk of folded.split('\r\n ')) {
    expect(Buffer.byteLength(chunk)).toBeLessThanOrEqual(75);
  }
  // and no empty leading chunk
  expect(folded.startsWith('\r\n ')).toBe(false);
});

test('fold-embedded-crlf-in-value', () => {
  // CRLF is a single grapheme cluster, so a fold must never land between
  // the CR and the LF. (Round-tripping is not a valid check here: the
  // input already contains a literal "\r\n " that unfolding would strip.)
  const str =
    'DESCRIPTION:' + 'Pharaoh’s dreams and rises to be viceroy. '.repeat(4);
  const withCrlf = str.replace('dreams', 'dreams\r\n');
  const folded = foldLine(withCrlf);
  expect(folded).not.toContain('\r\r\n \n');
  for (const chunk of folded.split('\r\n ')) {
    expect(Buffer.byteLength(chunk)).toBeLessThanOrEqual(75);
  }
});
