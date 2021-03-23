import {flags, Locale} from '@hebcal/core';
import {murmur3} from 'murmurhash-js';
import {pad2, pad4, getCalendarTitle, makeAnchor, getEventCategories,
  getHolidayDescription, makeTorahMemoText} from '@hebcal/rest-api';
import {promises as fs} from 'fs';
import {version} from '../package.json';

const VTIMEZONE = {};
const CATEGORY = {
  candles: 'Holiday',
  dafyomi: 'Daf Yomi',
  havdalah: 'Holiday',
  hebdate: null,
  holiday: 'Holiday',
  mevarchim: null,
  molad: null,
  omer: null,
  parashat: 'Parsha',
  roshchodesh: 'Holiday',
  user: 'Personal',
  zmanim: null,
};

/**
 * @private
 * @param {string[]} arr
 * @param {string} key
 * @param {string} val
 */
function addOptional(arr, key, val) {
  if (val) {
    const str = IcalEvent.escape(val);
    arr.push(key + ':' + str);
  }
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
  constructor(ev, options={}) {
    const dtstamp = options.dtstamp || IcalEvent.makeDtstamp(new Date());
    const timed = Boolean(ev.eventTime);
    let subj = timed || (ev.getFlags() & flags.DAF_YOMI) ? ev.renderBrief() : ev.render();
    const desc = ev.getDesc(); // original untranslated
    const mask = ev.getFlags();
    let location;
    if (timed && options.location && options.location.name) {
      const comma = options.location.name.indexOf(',');
      location = (comma == -1) ? options.location.name : options.location.name.substring(0, comma);
    }
    if (mask & flags.DAF_YOMI) {
      location = Locale.gettext('Daf Yomi');
    }

    const date = IcalEvent.formatYYYYMMDD(ev.getDate().greg());
    let startDate = date;
    let dtargs = '';
    let endDate;
    let transp = 'TRANSPARENT'; let busyStatus = 'FREE';
    if (timed) {
      let [hour, minute] = ev.eventTimeStr.split(':');
      hour = +hour;
      minute = +minute;
      startDate += 'T' + pad2(hour) + pad2(minute) + '00';
      endDate = startDate;
      if (options.location && options.location.tzid) {
        dtargs = `;TZID=${options.location.tzid}`;
      }
    } else {
      endDate = IcalEvent.formatYYYYMMDD(ev.getDate().next().greg());
      // for all-day untimed, use DTEND;VALUE=DATE intsead of DURATION:P1D.
      // It's more compatible with everthing except ancient versions of
      // Lotus Notes circa 2004
      dtargs = ';VALUE=DATE';
      if (mask & flags.CHAG) {
        transp = 'OPAQUE';
        busyStatus = 'OOF';
      }
    }

    let uid = ev.uid;
    if (!uid) {
      const digest = murmur3(desc).toString(16);
      uid = `hebcal-${date}-${digest}`;
      if (timed && options.location) {
        if (options.location.geoid) {
          uid += `-${options.location.geoid}`;
        } else if (options.location.name) {
          uid += '-' + makeAnchor(options.location.name);
        }
      }
    }

    // make subject safe for iCalendar
    subj = IcalEvent.escape(subj);

    if (options.appendHebrewToSubject) {
      const hebrew = ev.renderBrief('he');
      if (hebrew) {
        subj += ` / ${hebrew}`;
      }
    }

    const isUserEvent = Boolean(mask & flags.USER_EVENT);
    const category = CATEGORY[getEventCategories(ev)[0]];
    const categoryLine = category ? `CATEGORIES:${category}` : [];
    const arr = [
      'BEGIN:VEVENT',
      `DTSTAMP:${dtstamp}`,
    ].concat(categoryLine).concat([
      `SUMMARY:${subj}`,
      `DTSTART${dtargs}:${startDate}`,
      `DTEND${dtargs}:${endDate}`,
      `TRANSP:${transp}`,
      `X-MICROSOFT-CDO-BUSYSTATUS:${busyStatus}`,
      `UID:${uid}`,
    ]);

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
      alarm = '0DT3H30M0S'; // 8:30pm Omer alarm evening before
    } else if (isUserEvent) {
      alarm = '0DT12H0M0S'; // noon the day before
    } else if (timed && desc.startsWith('Candle lighting')) {
      alarm = '0DT0H10M0S'; // ten minutes
    }
    if (alarm) {
      arr.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'DESCRIPTION:This is an event reminder',
          `TRIGGER:-P${alarm}`,
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
    return this.getLines().join('\r\n');
  }

  /**
   * fold lines to 75 characters
   * @return {string[]}
   */
  getLines() {
    return this.getLongLines().map(IcalEvent.fold);
  }

  /**
   * @return {string[]}
   */
  getLongLines() {
    return this.lines;
  }

  /**
   * fold line to 75 characters
   * @param {string} line
   * @return {string}
   */
  static fold(line) {
    return line.length <= 74 ? line : line.match(char74re).join('\r\n ');
  }

  /**
   * @param {string} str
   * @return {string}
   */
  static escape(str) {
    if (str.indexOf(',') !== -1) {
      str = str.replace(/,/g, '\\,');
    }
    if (str.indexOf(';') !== -1) {
      str = str.replace(/;/g, '\\;');
    }
    return str;
  }

  /**
   * @param {Date} dt
   * @return {string}
   */
  static formatYYYYMMDD(dt) {
    return pad4(dt.getFullYear()) +
          pad2(dt.getMonth() + 1) + pad2(dt.getDate());
  }

  /**
   * Returns UTC string for iCalendar
   * @param {Date} dt
   * @return {string}
   */
  static makeDtstamp(dt) {
    const s = dt.toISOString();
    return s.slice(0, 4) + s.slice(5, 7) + s.slice(8, 13) +
              s.slice(14, 16) + s.slice(17, 19) + 'Z';
  }

  /** @return {string} */
  static version() {
    return version;
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
    if (!memo && typeof e.linkedEvent !== 'undefined') {
      memo = e.linkedEvent.render();
    }
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
 * Generates an RFC 2445 iCalendar string from an array of events
 * @param {Event[]} events
 * @param {HebrewCalendar.Options} options
 * @return {string}
 */
export async function eventsToIcalendar(events, options) {
  if (!events.length) throw new RangeError('Events can not be empty');
  if (!options) throw new TypeError('Invalid options object');
  const stream = [];
  const uclang = Locale.getLocaleName().toUpperCase();
  const title = options.title ? IcalEvent.escape(options.title) : getCalendarTitle(events, options);
  const caldesc = options.yahrzeit ?
    'Yahrzeits + Anniversaries from www.hebcal.com' :
    'Jewish Holidays from www.hebcal.com';
  const publishedTTL = options.publishedTTL || 'PT7D';
  const preamble = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//hebcal.com/NONSGML Hebcal Calendar v1${version}//${uclang}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-LOTUS-CHARSET:UTF-8',
    `X-PUBLISHED-TTL:${publishedTTL}`,
    `X-WR-CALNAME:${title}`,
    `X-WR-CALDESC:${caldesc}`,
  ];
  for (const line of preamble) {
    stream.push(line);
    stream.push('\r\n');
  }
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
      const vtimezoneFilename = `./zoneinfo/${tzid}.ics`;
      try {
        const vtimezoneIcs = await fs.readFile(vtimezoneFilename, 'utf-8');
        const lines = vtimezoneIcs.split('\r\n');
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

  options.dtstamp = IcalEvent.makeDtstamp(new Date());
  for (const ev of events) {
    const ical = new IcalEvent(ev, options);
    const lines = ical.getLines();
    for (const line of lines) {
      stream.push(line);
      stream.push('\r\n');
    }
  }
  stream.push('END:VCALENDAR\r\n');
  return stream.join('');
}
