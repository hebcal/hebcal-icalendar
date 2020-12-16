import {flags, Locale} from '@hebcal/core';
import {murmur3} from 'murmurhash-js';
import {pad2, getCalendarTitle, renderTitleWithoutTime, makeAnchor,
  getHolidayDescription, makeTorahMemoText} from '@hebcal/rest-api';
import fs from 'fs';
import {Readable} from 'stream';
import {version} from '../package.json';

const VTIMEZONE = {};

/**
 * @private
 * @param {Date} d
 * @return {string}
 */
function formatYYYYMMDD(d) {
  return String(d.getFullYear()).padStart(4, '0') +
        pad2(d.getMonth() + 1) + pad2(d.getDate());
}

/**
 * Returns UTC string for iCalendar
 * @private
 * @param {Date} dt
 * @return {string}
 */
function makeDtstamp(dt) {
  const s = dt.toISOString();
  return s.slice(0, 4) + s.slice(5, 7) + s.slice(8, 13) +
            s.slice(14, 16) + s.slice(17, 19) + 'Z';
}

/**
 * @private
 * @param {string[]} arr
 * @param {string} key
 * @param {string} val
 */
function addOptional(arr, key, val) {
  if (val) {
    const str = icalEscapeStr(val);
    arr.push(key + ':' + str);
  }
}

/**
 * @private
 * @param {string} str
 * @return {string}
 */
function icalEscapeStr(str) {
  return str.replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/**
 * @private
 * @param {string} url
 * @param {boolean} il
 * @return {string}
 */
function appendTrackingToUrl(url, il) {
  if (!url) {
    return url;
  } else if (url.startsWith('https://www.hebcal.com')) {
    const suffix = il ? 'i=on&' : '';
    return `${url}?${suffix}utm_source=js&utm_medium=icalendar`;
  } else {
    const sep = url.indexOf('?') == -1 ? '?' : '&';
    return url + sep + 'utm_source=hebcal.com&utm_medium=icalendar';
  }
}

const char74re = /(.{1,74})/g;

/**
 * Represents an RFC 2445 iCalendar VEVENT
 */
export class IcalEvent {
  /**
   * Builds an IcalEvent object from a Hebcal Event
   * @param {Event} ev
   * @param {HebrewCalendar.Options} options
   */
  constructor(ev, options) {
    const dtstamp = options.dtstamp || makeDtstamp(new Date());
    const timed = Boolean(ev.eventTime);
    let subj = timed ? renderTitleWithoutTime(ev) : ev.render();
    const desc = ev.getDesc(); // original untranslated
    const mask = ev.getFlags();
    let location;
    if (timed && options.location.name) {
      const comma = options.location.name.indexOf(',');
      location = (comma == -1) ? options.location.name : options.location.name.substring(0, comma);
    }
    if (mask & flags.DAF_YOMI) {
      const colon = subj.indexOf(': ');
      if (colon != -1) {
        location = subj.substring(0, colon);
        subj = subj.substring(colon + 2);
      }
    }

    const date = formatYYYYMMDD(ev.getDate().greg());
    let startDate = date;
    let dtargs; let endDate;
    let transp = 'TRANSPARENT'; let busyStatus = 'FREE';
    if (timed) {
      let [hour, minute] = ev.eventTimeStr.split(':');
      hour = +hour;
      minute = +minute;
      startDate += 'T' + pad2(hour) + pad2(minute) + '00';
      endDate = startDate;
      dtargs = `;TZID=${options.location.tzid}`;
    } else {
      endDate = formatYYYYMMDD(ev.getDate().next().greg());
      // for all-day untimed, use DTEND;VALUE=DATE intsead of DURATION:P1D.
      // It's more compatible with everthing except ancient versions of
      // Lotus Notes circa 2004
      dtargs = ';VALUE=DATE';
      if (mask & flags.CHAG) {
        transp = 'OPAQUE';
        busyStatus = 'OOF';
      }
    }

    const digest = murmur3(desc).toString(16);
    let uid = `hebcal-${date}-${digest}`;
    if (timed && options.location) {
      if (options.location.geoid) {
        uid += `-${options.location.geoid}`;
      } else if (options.location.name) {
        uid += '-' + makeAnchor(options.location.name);
      }
    }

    // make subject safe for iCalendar
    subj = subj.replace(/,/g, '\\,');

    if (options.appendHebrewToSubject) {
      const hebrew = ev.renderBrief('he');
      if (hebrew) {
        subj += ` / ${hebrew}`;
      }
    }

    const isUserEvent = Boolean(mask & flags.USER_EVENT);
    const category = isUserEvent ? 'Personal' : 'Holiday';
    const arr = [
      'BEGIN:VEVENT',
      `DTSTAMP:${dtstamp}`,
      `CATEGORIES:${category}`,
      `SUMMARY:${subj}`,
      `DTSTART${dtargs}:${startDate}`,
      `DTEND${dtargs}:${endDate}`,
      `TRANSP:${transp}`,
      `X-MICROSOFT-CDO-BUSYSTATUS:${busyStatus}`,
      `UID:${uid}`,
    ];

    if (!isUserEvent) {
      arr.push('CLASS:PUBLIC');
    }

    // create memo (holiday descr, Torah, etc)
    const candles = (desc === 'Havdalah' || desc === 'Candle lighting');
    const memo = candles ? '' : createMemo(ev, options.il);
    addOptional(arr, 'DESCRIPTION', memo);
    addOptional(arr, 'LOCATION', location);
    if (timed && options.location) {
      arr.push('GEO:' + options.location.latitude + ';' + options.location.longitude);
    }

    let alarm;
    if (mask & flags.OMER_COUNT) {
      alarm = '3H'; // 9pm Omer alarm evening before
    } else if (isUserEvent) {
      alarm = '12H'; // noon the day before
    } else if (timed && desc.startsWith('Candle lighting')) {
      alarm = '10M'; // ten minutes
    }
    if (alarm) {
      arr.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'DESCRIPTION:REMINDER',
          `TRIGGER;RELATED=START:-PT${alarm}`,
          'END:VALARM',
      );
    }

    arr.push('END:VEVENT');

    this.lines = arr;
    this.options = options;
    this.ev = ev;
  }

  /**
   * @return {string}
   */
  toString() {
    return this.getFoldedLines().join('\r\n');
  }

  /**
   * @return {NodeJS.ReadableStream}
   */
  toStream() {
    const readable = new Readable();
    const lines = this.getFoldedLines();
    for (const line of lines) {
      readable.push(line);
      readable.push('\r\n');
    }
    readable.push(null);
    return readable;
  }

  /**
   * fold lines to 75 characters
   * @return {string[]}
   */
  getFoldedLines() {
    return this.getLines().map((line) => {
      return line.length <= 74 ? line : line.match(char74re).join('\r\n ');
    });
  }

  /**
   * @return {string[]}
   */
  getLines() {
    return this.lines;
  }
}

/**
 * Transforms a single Event into a VEVENT string
 * @param {Event} ev
 * @param {HebrewCalendar.Options} options
 * @return {string} multi-line result, delimited by \r\n
 */
export function eventToIcal(ev, options) {
  const ical = new IcalEvent(ev, options);
  return ical.toString();
}

/**
 * @private
 * @param {Event} e
 * @param {boolean} il
 * @return {string}
 */
function createMemo(e, il) {
  const url = appendTrackingToUrl(e.url(), il);
  const torahMemo = makeTorahMemoText(e, il).replace(/\n/g, '\\n');
  if (e.getFlags() & flags.PARSHA_HASHAVUA) {
    return torahMemo + '\\n\\n' + url;
  } else {
    let memo = e.memo || getHolidayDescription(e);
    if (torahMemo) {
      memo += '\\n' + torahMemo;
    }
    if (url) {
      if (memo.length) {
        memo += '\\n\\n';
      }
      memo += url;
    }
    return memo;
  }
}

/**
 * Generates an RFC 2445 iCalendar stream from an array of events
 * @param {NodeJS.ReadableStream} stream
 * @param {Event[]} events
 * @param {HebrewCalendar.Options} options
 */
export function eventsToIcalendarStream(stream, events, options) {
  if (!events.length) throw new RangeError('Events can not be empty');
  if (!options) throw new TypeError('Invalid options object');
  const uclang = Locale.getLocaleName().toUpperCase();
  const title = options.title ? icalEscapeStr(options.title) : getCalendarTitle(events, options);
  const caldesc = options.yahrzeit ?
    'Yahrzeits + Anniversaries from www.hebcal.com' :
    'Jewish Holidays from www.hebcal.com';
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//hebcal.com/NONSGML Hebcal Calendar v1${version}//${uclang}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-LOTUS-CHARSET:UTF-8',
    'X-PUBLISHED-TTL:PT7D',
    `X-WR-CALNAME:${title}`,
    `X-WR-CALDESC:${caldesc}`,
  ].forEach((line) => {
    stream.push(line);
    stream.push('\r\n');
  });
  if (options.relcalid) {
    stream.push(`X-WR-RELCALID:${options.relcalid}\r\n`);
  }
  const location = options.location;
  if (location && location.tzid) {
    const tzid = location.tzid;
    stream.push(`X-WR-TIMEZONE;VALUE=TEXT:${tzid}\r\n`);
    if (VTIMEZONE[tzid]) {
      stream.push(VTIMEZONE[tzid]);
      stream.push('\r\n');
    } else {
      try {
        const vtimezoneIcs = `./zoneinfo/${tzid}.ics`;
        const lines = fs.readFileSync(vtimezoneIcs, 'utf-8').split('\r\n');
        // ignore first 3 and last 1 lines
        const str = lines.slice(3, lines.length - 2).join('\r\n');
        stream.push(str);
        stream.push('\r\n');
        VTIMEZONE[tzid] = str; // cache for later
      } catch (error) {
        // ignore failure when no timezone definition to read
      }
    }
  }

  options.dtstamp = makeDtstamp(new Date());
  events.forEach((ev) => {
    const ical = new IcalEvent(ev, options);
    const lines = ical.getFoldedLines();
    lines.forEach((line) => {
      stream.push(line);
      stream.push('\r\n');
    });
  });
  stream.push('END:VCALENDAR\r\n');
  stream.push(null);
}

/**
 * @private
 * @param {stream.Readable} readable
 * @return {string}
 */
async function readableToString(readable) {
  let result = '';
  for await (const chunk of readable) {
    result += chunk;
  }
  return result;
}

/**
 * Renders an array of events as a full RFC 2445 iCalendar string
 * @param {Event[]} events
 * @param {HebrewCalendar.Options} options
 * @return {string} multi-line result, delimited by \r\n
 */
export async function eventsToIcalendar(events, options) {
  const readStream = new Readable();
  eventsToIcalendarStream(readStream, events, options);
  readStream.on('error', (err) => {
    throw err;
  });
  return readableToString(readStream);
}
