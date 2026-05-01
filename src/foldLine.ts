import {Buffer} from 'node:buffer';

let foldSegmenter: Intl.Segmenter | undefined;
const char74re = /.{1,74}/g;

export function foldLine(line: string): string {
  const lineBytes = Buffer.byteLength(line);
  if (lineBytes <= 74) {
    return line;
  }
  if (lineBytes === line.length) {
    // All-ASCII fast path: every UTF-16 unit encodes to one UTF-8 byte
    // iff the string is pure ASCII, so we can split by JS chars.
    return line.match(char74re)!.join('\r\n ');
  }
  // Walk grapheme clusters so we never split a multi-octet UTF-8
  // sequence (or a combining/ZWJ/regional-indicator cluster) across
  // a fold boundary. Reuse a single Segmenter to avoid per-call
  // construction cost.
  if (!foldSegmenter) {
    foldSegmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});
  }
  const parts: string[] = [];
  let chunkStart = 0;
  let len = 0;
  for (const {segment, index} of foldSegmenter.segment(line)) {
    const cp = segment.codePointAt(0)!;
    // Most segments are a single code point; compute UTF-8 length
    // arithmetically and skip the Buffer.byteLength call.
    const cpUnits = cp >= 0x10000 ? 2 : 1;
    let octets: number;
    if (segment.length === cpUnits) {
      octets = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    } else {
      octets = Buffer.byteLength(segment);
    }
    if (len + octets >= 75) {
      parts.push(line.slice(chunkStart, index));
      chunkStart = index;
      len = octets;
    } else {
      len += octets;
    }
  }
  parts.push(line.slice(chunkStart));
  return parts.join('\r\n ');
}
