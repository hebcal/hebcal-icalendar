import {Buffer} from 'node:buffer';

let foldSegmenter: Intl.Segmenter | undefined;

/**
 * Number of UTF-8 octets used to encode the code point starting at `i`.
 * Returns 4 for a surrogate pair (which occupies two UTF-16 units).
 */
function octetsAt(line: string, i: number): number {
  const c = line.charCodeAt(i);
  if (c < 0x80) {
    return 1;
  }
  if (c < 0x800) {
    return 2;
  }
  // A high surrogate starts a 4-octet code point; an unpaired surrogate
  // still encodes as 3 octets, but WHATWG replaces it with U+FFFD, which
  // is also 3 octets, so the count stays correct either way.
  if (c >= 0xd800 && c <= 0xdbff && i + 1 < line.length) {
    const lo = line.charCodeAt(i + 1);
    if (lo >= 0xdc00 && lo <= 0xdfff) {
      return 4;
    }
  }
  return 3;
}

export function foldLine(line: string): string {
  const lineBytes = Buffer.byteLength(line);
  if (lineBytes <= 74) {
    return line;
  }
  if (lineBytes === line.length) {
    // All-ASCII fast path: every UTF-16 unit encodes to one UTF-8 byte
    // iff the string is pure ASCII, so we can split by JS chars.
    // A /.{1,74}/g regex looks tempting here but is wrong: `.` does not
    // match \r or \n, so it silently drops those characters and returns
    // null outright for a line built only from them.
    const parts: string[] = [];
    for (let i = 0; i < line.length; i += 74) {
      parts.push(line.slice(i, i + 74));
    }
    return parts.join('\r\n ');
  }
  // Fold on code-point boundaries so a multi-octet UTF-8 sequence is never
  // split, then pull each break back to the start of its grapheme cluster
  // so combining marks, ZWJ sequences and regional-indicator pairs stay
  // with their base character.
  //
  // Only the break positions need the Segmenter, and there are at most
  // lineBytes/74 of them, so we ask it about those offsets via
  // `containing()` rather than iterating every cluster in the line --
  // the same fold points for a fraction of the work.
  if (!foldSegmenter) {
    foldSegmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});
  }
  const segments = foldSegmenter.segment(line);
  const parts: string[] = [];
  const n = line.length;
  let chunkStart = 0;
  let len = 0;
  let i = 0;
  while (i < n) {
    const octets = octetsAt(line, i);
    const units = octets === 4 ? 2 : 1;
    if (len + octets >= 75) {
      let brk = i;
      if (i > chunkStart) {
        const cluster = segments.containing(i);
        // Back up to the cluster start, unless that would consume the whole
        // chunk -- a single cluster wider than the limit has to be split.
        if (cluster && cluster.index > chunkStart && cluster.index < i) {
          brk = cluster.index;
        }
      }
      parts.push(line.slice(chunkStart, brk));
      chunkStart = brk;
      // Anything we backed up over carries into the next chunk.
      len = 0;
      for (let k = brk; k < i + units; k += octetsAt(line, k) === 4 ? 2 : 1) {
        len += octetsAt(line, k);
      }
    } else {
      len += octets;
    }
    i += units;
  }
  parts.push(line.slice(chunkStart));
  return parts.join('\r\n ');
}
