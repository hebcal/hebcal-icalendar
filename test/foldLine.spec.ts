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
