import {flags, Locale, greg} from '@hebcal/core';
import {murmur32HexSync} from 'murmurhash3';
import {pad2, pad4, getCalendarTitle, makeAnchor, getEventCategories,
  getHolidayDescription, makeTorahMemoText, appendIsraelAndTracking,
  shouldRenderBrief} from '@hebcal/rest-api';
import {promises as fs} from 'fs';
import {version} from './pkgVersion.js';

const vtimezoneCache = new Map();
const CATEGORY = {
  candles: 'Holiday',
  dafyomi: 'Daf Yomi',
  mishnayomi: 'Mishna Yomi',
  nachyomi: 'Nach Yomi',
  yerushalmi: 'Yerushalmi Yomi',
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
 * @param {CalOptions} options
 * @return {string}
 */
function appendTrackingToUrl(url, options) {
  if (!url) {
    return null;
  }
  const utmSource = options.utmSource || 'js';
  const utmMedium = options.utmMedium || 'icalendar';
  const utmCampaign = options.utmCampaign;
  return appendIsraelAndTracking(url,
      options.il, utmSource, utmMedium, utmCampaign);
}

const encoder = new TextEncoder();
const char74re = /(.{1,74})/g;

const DAILY_LEARNING = flags.DAILY_LEARNING | flags.DAF_YOMI |
  flags.MISHNA_YOMI | flags.YERUSHALMI_YOMI | flags.NACH_YOMI;

/**
 * Represents an RFC 2445 iCalendar VEVENT
 */
export class IcalEvent {
  /**
   * Builds an IcalEvent object from a Hebcal Event
   * @param {Event} ev
   * @param {CalOptions} options
   */
  constructor(ev, options={}) {
    this.ev = ev;
    this.options = options;
    this.dtstamp = options.dtstamp || IcalEvent.makeDtstamp(new Date());
    if (typeof ev.sequence === 'number') {
      this.sequence = ev.sequence;
    } else if (typeof options.sequence === 'number') {
      this.sequence = options.sequence;
    }
    const timed = this.timed = Boolean(ev.eventTime);
    const locale = options.locale;
    const location = options.location;
    let subj = shouldRenderBrief(ev) ? ev.renderBrief(locale) : ev.render(locale);
    const mask = ev.getFlags();
    if (ev.locationName) {
      this.locationName = ev.locationName;
    } else if (timed && location) {
      this.locationName = location.getShortName();
    } else if ((mask & DAILY_LEARNING) && ev.category) {
      this.locationName = Locale.gettext(ev.category, locale);
    }
    const date = IcalEvent.formatYYYYMMDD(ev.getDate().greg());
    this.startDate = this.isoDateOnly = date;
    this.dtargs = '';
    this.transp = 'TRANSPARENT';
    this.busyStatus = 'FREE';
    if (timed) {
      let [hour, minute] = ev.eventTimeStr.split(':');
      hour = +hour;
      minute = +minute;
      this.startDate += 'T' + pad2(hour) + pad2(minute) + '00';
      this.endDate = this.startDate;
      if (location?.getTzid()) {
        this.dtargs = `;TZID=${location.getTzid()}`;
      }
    } else {
      this.endDate = IcalEvent.formatYYYYMMDD(ev.getDate().next().greg());
      // for all-day untimed, use DTEND;VALUE=DATE intsead of DURATION:P1D.
      // It's more compatible with everthing except ancient versions of
      // Lotus Notes circa 2004
      this.dtargs = ';VALUE=DATE';
      if (mask & flags.CHAG) {
        this.transp = 'OPAQUE';
        this.busyStatus = 'OOF';
      }
    }

    if (options.emoji) {
      const prefix = ev.getEmoji();
      if (prefix) {
        if (mask & flags.OMER_COUNT) {
          subj = subj + ' ' + prefix;
        } else {
          subj = prefix + ' ' + subj;
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
    this.subj = subj;
    this.category = ev.category || CATEGORY[getEventCategories(ev)?.[0]];
  }


  /**
   * @return {string}
   */
  getAlarm() {
    const ev = this.ev;
    const mask = ev.getFlags();
    const evAlarm = ev.alarm;
    if (typeof evAlarm === 'string') {
      return 'TRIGGER:' + evAlarm;
    } else if (typeof evAlarm === 'boolean' && !evAlarm) {
      return null;
    } else if (greg.isDate(evAlarm)) {
      evAlarm.setSeconds(0);
      return 'TRIGGER;VALUE=DATE-TIME:' + IcalEvent.makeDtstamp(evAlarm);
    } else if (mask & flags.OMER_COUNT) {
      return 'TRIGGER:-P0DT3H30M0S'; // 8:30pm Omer alarm evening before
    } else if (mask & flags.USER_EVENT) {
      return 'TRIGGER:-P0DT12H0M0S'; // noon the day before
    } else if (this.timed && ev.getDesc().startsWith('Candle lighting')) {
      return 'TRIGGER:-P0DT0H10M0S';
    }
    return null;
  }

  /**
   * @return {string}
   */
  getUid() {
    const options = this.options;
    const digest = murmur32HexSync(this.ev.getDesc());
    let uid = `hebcal-${this.isoDateOnly}-${digest}`;
    const loc = options.location;
    if (this.timed && loc) {
      if (loc.getGeoId()) {
        uid += `-${loc.getGeoId()}`;
      } else if (loc.getName()) {
        uid += '-' + makeAnchor(loc.getName());
      }
    }
    return uid;
  }

  /**
   * @return {string[]}
   */
  getLongLines() {
    if (this.lines) return this.lines;
    const categoryLine = this.category ? [`CATEGORIES:${this.category}`] : [];
    const uid = this.ev.uid || this.getUid();
    if (this.sequence) {
      categoryLine.unshift(`SEQUENCE:${this.sequence}`);
    }
    const arr = this.lines = [
      'BEGIN:VEVENT',
      `DTSTAMP:${this.dtstamp}`,
    ].concat(categoryLine).concat([
      `SUMMARY:${this.subj}`,
      `DTSTART${this.dtargs}:${this.startDate}`,
      `DTEND${this.dtargs}:${this.endDate}`,
      `UID:${uid}`,
      `TRANSP:${this.transp}`,
      `X-MICROSOFT-CDO-BUSYSTATUS:${this.busyStatus}`,
    ]);

    if (!this.timed) {
      arr.push('X-MICROSOFT-CDO-ALLDAYEVENT:TRUE');
    }

    const ev = this.ev;
    const mask = ev.getFlags();
    const isUserEvent = Boolean(mask & flags.USER_EVENT);
    if (!isUserEvent) {
      arr.push('CLASS:PUBLIC');
    }

    const options = this.options;
    // create memo (holiday descr, Torah, etc)
    const memo = createMemo(ev, options);
    addOptional(arr, 'DESCRIPTION', memo);
    addOptional(arr, 'LOCATION', this.locationName);
    const loc = options.location;
    if (this.timed && loc) {
      arr.push('GEO:' + loc.getLatitude() + ';' + loc.getLongitude());
    }

    const trigger = this.getAlarm();
    if (trigger) {
      arr.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'DESCRIPTION:Event reminder',
          `${trigger}`,
          'END:VALARM',
      );
    }

    arr.push('END:VEVENT');

    return arr;
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
   * fold line to 75 characters
   * @param {string} line
   * @return {string}
   */
  static fold(line) {
    let isASCII = true;
    for (let i = 0; i < line.length; i++) {
      if (line.charCodeAt(i) > 255) {
        isASCII = false;
        break;
      }
    }
    if (isASCII) {
      return line.length <= 74 ? line : line.match(char74re).join('\r\n ');
    }
    if (encoder.encode(line).length <= 74) {
      return line;
    }
    // iterate unicode character by character, making sure
    // that adding a new character would keep the line <= 75 octets
    let result = '';
    let current = '';
    let len = 0;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const octets = char.charCodeAt(0) < 256 ? 1 : encoder.encode(char).length;
      const newlen = len + octets;
      if (newlen < 75) {
        current += char;
        len = newlen;
      } else {
        result += current + '\r\n ';
        line = line.substring(i);
        current = '';
        len = 0;
        i = -1;
      }
    }
    return result + current;
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
 * @param {CalOptions} options
 * @return {string} multi-line result, delimited by \r\n
 */
export function eventToIcal(ev, options) {
  const ical = new IcalEvent(ev, options);
  return ical.toString();
}

const torahMemoCache = new Map();

const HOLIDAY_IGNORE_MASK = DAILY_LEARNING | flags.OMER_COUNT |
  flags.SHABBAT_MEVARCHIM | flags.MOLAD | flags.USER_EVENT |
  flags.HEBREW_DATE;

/**
 * @private
 * @param {Event} ev
 * @param {boolean} il
 * @return {string}
 */
function makeTorahMemo(ev, il) {
  if ((ev.getFlags() & HOLIDAY_IGNORE_MASK) || ev.eventTime) {
    return '';
  }
  const hd = ev.getDate();
  const yy = hd.getFullYear();
  const mm = hd.getMonth();
  const dd = hd.getDate();
  const key = [yy, mm, dd, il ? '1' : '0', ev.getDesc()].join('-');
  let memo = torahMemoCache.get(key);
  if (typeof memo === 'string') {
    return memo;
  }
  memo = makeTorahMemoText(ev, il).replace(/\n/g, '\\n');
  torahMemoCache.set(key, memo);
  return memo;
}

/**
 * @private
 * @param {Event} e
 * @param {CalOptions} options
 * @return {string}
 */
function createMemo(e, options) {
  let memo = e.memo;
  if (typeof memo === 'string' && memo.length && memo.indexOf('\n') !== -1) {
    memo = memo.replace(/\n/g, '\\n');
  }
  const desc = e.getDesc();
  if (desc === 'Havdalah' || desc === 'Candle lighting') {
    return memo || '';
  }
  const mask = e.getFlags();
  if (mask & flags.OMER_COUNT) {
    const sefira = [e.sefira('en'), e.sefira('he'), e.sefira('translit')].join('\\n');
    return e.getTodayIs('en') + '\\n\\n' + e.getTodayIs('he') + '\\n\\n' + sefira;
  }
  const url = appendTrackingToUrl(e.url(), options);
  const torahMemo = makeTorahMemo(e, options.il);
  if (!memo) {
    if (typeof e.linkedEvent !== 'undefined') {
      memo = e.linkedEvent.render(options.locale);
    } else {
      memo = getHolidayDescription(e);
    }
  }
  if (torahMemo) {
    if (memo.length) {
      memo += '\\n\\n';
    }
    memo += torahMemo;
  }
  if (url) {
    if (memo.length) {
      memo += '\\n\\n';
    }
    memo += url;
  }
  return memo;
}

/**
 * Generates an RFC 2445 iCalendar string from an array of events
 * @param {Event[]} events
 * @param {CalOptions} options
 * @return {Promise<string>}
 */
export async function eventsToIcalendar(events, options) {
  if (!events.length) throw new RangeError('Events can not be empty');
  if (!options) throw new TypeError('Invalid options object');
  const opts = Object.assign({}, options);
  opts.dtstamp = opts.dtstamp || IcalEvent.makeDtstamp(new Date());
  if (!opts.title) {
    opts.title = getCalendarTitle(events, opts);
  }
  const icals = events.map((ev) => new IcalEvent(ev, opts));
  return icalEventsToString(icals, opts);
}

/**
 * Generates an RFC 2445 iCalendar string from an array of IcalEvents
 * @param {IcalEvent[]} icals
 * @param {CalOptions} options
 * @return {Promise<string>}
 */
export async function icalEventsToString(icals, options) {
  const stream = [];
  const locale = options.locale || Locale.getLocaleName();
  const uclang = locale.toUpperCase();
  const opts = Object.assign({}, options);
  opts.dtstamp = opts.dtstamp || IcalEvent.makeDtstamp(new Date());
  const title = opts.title ? IcalEvent.escape(opts.title) : 'Untitled';
  const caldesc = opts.caldesc ? IcalEvent.escape(opts.caldesc) :
    opts.yahrzeit ?
    'Yahrzeits + Anniversaries from www.hebcal.com' :
    'Jewish Holidays from www.hebcal.com';
  const prodid = opts.prodid || `-//hebcal.com/NONSGML Hebcal Calendar v1${version}//${uclang}`;
  const preamble = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodid}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-LOTUS-CHARSET:UTF-8',
  ];
  if (opts.publishedTTL !== false) {
    const publishedTTL = opts.publishedTTL || 'PT7D';
    preamble.push(`X-PUBLISHED-TTL:${publishedTTL}`);
  }
  preamble.push(`X-WR-CALNAME:${title}`);
  preamble.push(`X-WR-CALDESC:${caldesc}`);
  for (const line of preamble.map(IcalEvent.fold)) {
    stream.push(line);
    stream.push('\r\n');
  }
  if (opts.relcalid) {
    stream.push(IcalEvent.fold(`X-WR-RELCALID:${opts.relcalid}`));
    stream.push('\r\n');
  }
  if (opts.calendarColor) {
    stream.push(`X-APPLE-CALENDAR-COLOR:${opts.calendarColor}\r\n`);
  }
  const location = opts.location;
  const tzid = location?.getTzid();
  if (tzid) {
    stream.push(`X-WR-TIMEZONE;VALUE=TEXT:${tzid}\r\n`);
    const vtz = vtimezoneCache.get(tzid);
    if (typeof vtz === 'string') {
      stream.push(vtz);
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
        vtimezoneCache.set(tzid, str);
      } catch (error) {
        // ignore failure when no timezone definition to read
      }
    }
  }

  for (const ical of icals) {
    const lines = ical.getLines();
    for (const line of lines) {
      stream.push(line);
      stream.push('\r\n');
    }
  }
  stream.push('END:VCALENDAR\r\n');
  return stream.join('');
}
