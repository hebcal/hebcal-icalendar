import {Event, flags} from '@hebcal/core/dist/esm/event';
import {CalOptions} from '@hebcal/core/dist/esm/CalOptions';
import {Locale} from '@hebcal/core/dist/esm/locale';
import {OmerEvent} from '@hebcal/core/dist/esm/omer';
import {murmur32HexSync} from 'murmurhash3';
import {pad2, pad4, isDate} from '@hebcal/hdate';
import {
  getCalendarTitle,
  getEventCategories,
  shouldRenderBrief,
} from '@hebcal/rest-api/dist/esm/common';
import {getHolidayDescription} from '@hebcal/rest-api/dist/esm/holiday';
import {makeTorahMemoText} from '@hebcal/rest-api/dist/esm/memo';
import {appendIsraelAndTracking} from '@hebcal/rest-api/dist/esm/url';
import {makeAnchor} from '@hebcal/rest-api/dist/esm/makeAnchor';
import {promises as fs} from 'node:fs';
import {version} from './pkgVersion';

const vtimezoneCache = new Map<string, string>();
const CATEGORY: {[key: string]: string | null} = {
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
 */
function addOptional(
  arr: string[],
  key: string,
  val: string | null | undefined
) {
  if (val) {
    const str = IcalEvent.escape(val);
    arr.push(key + ':' + str);
  }
}

export type ICalEventOptions = {
  dtstamp?: string;
  sequence?: number;
  emoji?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  appendHebrewToSubject?: boolean;
  prodid?: string;
  caldesc?: string;
  title?: string;
  publishedTTL?: string | boolean;
  calendarColor?: string;
  relcalid?: string;
  yahrzeit?: boolean;
  subscribe?: string | boolean;
  url?: boolean;
};

export type ICalOptions = CalOptions & ICalEventOptions;

/**
 * @private
 */
function appendTrackingToUrl(
  url: string | undefined,
  options: ICalOptions
): string | null {
  if (!url) {
    return null;
  }
  let utmSource = options.utmSource;
  if (!utmSource) {
    const u = new URL(url);
    if (u.host === 'www.hebcal.com') {
      utmSource = 'ical';
    }
  }
  const utmMedium = options.utmMedium || 'icalendar';
  const utmCampaign = options.utmCampaign;
  return appendIsraelAndTracking(
    url,
    options.il!,
    utmSource,
    utmMedium,
    utmCampaign
  );
}

const encoder = new TextEncoder();
const char74re = /(.{1,74})/g;

const DAILY_LEARNING =
  flags.DAILY_LEARNING |
  flags.DAF_YOMI |
  flags.MISHNA_YOMI |
  flags.YERUSHALMI_YOMI |
  flags.NACH_YOMI;

/**
 * Represents an RFC 2445 iCalendar VEVENT
 */
export class IcalEvent {
  ev: Event;
  options: ICalOptions;
  dtstamp: string;
  sequence?: number;
  timed: boolean;
  locationName: string | null | undefined;
  startDate: string;
  isoDateOnly: string;
  dtargs: string;
  transp: string;
  busyStatus: string;
  endDate: string;
  subj: string;
  category: string | null;
  lines?: string[];
  /**
   * Builds an IcalEvent object from a Hebcal Event
   */
  constructor(ev: Event, options: ICalOptions = {}) {
    this.ev = ev;
    const opts: ICalOptions = {...options};
    this.options = opts;
    this.dtstamp = opts.dtstamp || IcalEvent.makeDtstamp(new Date());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ev0 = ev as any;
    if (typeof ev0.sequence === 'number') {
      this.sequence = ev0.sequence;
    } else if (typeof opts.sequence === 'number') {
      this.sequence = opts.sequence;
    }
    const timed = (this.timed = Boolean(ev0.eventTime));
    const locale = opts.locale;
    const location = opts.location;
    let subj = shouldRenderBrief(ev)
      ? ev.renderBrief(locale)
      : ev.render(locale);
    const mask = ev.getFlags();
    if (ev0.locationName) {
      this.locationName = ev0.locationName;
    } else if (timed && location) {
      this.locationName = location.getShortName();
    } else if (mask & DAILY_LEARNING && ev0.category) {
      this.locationName = Locale.gettext(ev0.category, locale);
    }
    const hd = ev.getDate();
    const date = IcalEvent.formatYYYYMMDD(hd.greg());
    this.startDate = this.isoDateOnly = date;
    this.dtargs = '';
    this.transp = 'TRANSPARENT';
    this.busyStatus = 'FREE';
    if (timed) {
      let [hour, minute] = ev0.eventTimeStr.split(':');
      hour = +hour;
      minute = +minute;
      this.startDate += 'T' + pad2(hour) + pad2(minute) + '00';
      this.endDate = this.startDate;
      if (location?.getTzid()) {
        this.dtargs = `;TZID=${location.getTzid()}`;
      }
    } else {
      this.endDate = IcalEvent.formatYYYYMMDD(hd.next().greg());
      // for all-day untimed, use DTEND;VALUE=DATE intsead of DURATION:P1D.
      // It's more compatible with everthing except ancient versions of
      // Lotus Notes circa 2004
      this.dtargs = ';VALUE=DATE';
      if (mask & flags.CHAG) {
        this.transp = 'OPAQUE';
        this.busyStatus = 'OOF';
      }
    }

    if (opts.emoji) {
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

    if (opts.appendHebrewToSubject) {
      const hebrew = ev.renderBrief('he');
      if (hebrew) {
        subj += ` / ${hebrew}`;
      }
    }
    this.subj = subj;
    this.category = ev0.category || CATEGORY[getEventCategories(ev)?.[0]];
  }

  getAlarm(): string | null {
    const ev = this.ev;
    const mask = ev.getFlags();
    const evAlarm = ev.alarm;
    if (typeof evAlarm === 'string') {
      return 'TRIGGER:' + evAlarm;
    } else if (typeof evAlarm === 'boolean' && !evAlarm) {
      return null;
    } else if (isDate(evAlarm)) {
      const alarmDt = evAlarm as Date;
      alarmDt.setSeconds(0);
      return 'TRIGGER;VALUE=DATE-TIME:' + IcalEvent.makeDtstamp(alarmDt);
    } else if (mask & flags.OMER_COUNT) {
      return 'TRIGGER:-P0DT3H30M0S'; // 8:30pm Omer alarm evening before
    } else if (mask & flags.USER_EVENT) {
      return 'TRIGGER:-P0DT12H0M0S'; // noon the day before
    } else if (this.timed && ev.getDesc().startsWith('Candle lighting')) {
      return 'TRIGGER:-P0DT0H10M0S';
    }
    return null;
  }

  getUid(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let uid = (this.ev as any).uid;
    if (uid) {
      return uid;
    }
    const digest = murmur32HexSync(this.ev.getDesc());
    uid = `hebcal-${this.isoDateOnly}-${digest}`;
    const loc = this.options.location;
    if (this.timed && loc) {
      if (loc.getGeoId()) {
        uid += `-${loc.getGeoId()}`;
      } else if (loc.getName()) {
        uid += '-' + makeAnchor(loc.getName()!);
      }
    }
    return uid;
  }

  getLongLines(): string[] {
    if (this.lines) return this.lines;
    const categoryLine = this.category ? [`CATEGORIES:${this.category}`] : [];
    const uid = this.getUid();
    if (this.sequence) {
      categoryLine.unshift(`SEQUENCE:${this.sequence}`);
    }
    const arr = (this.lines = ['BEGIN:VEVENT', `DTSTAMP:${this.dtstamp}`]
      .concat(categoryLine)
      .concat([
        `SUMMARY:${this.subj}`,
        `DTSTART${this.dtargs}:${this.startDate}`,
        `DTEND${this.dtargs}:${this.endDate}`,
        `UID:${uid}`,
        `TRANSP:${this.transp}`,
        `X-MICROSOFT-CDO-BUSYSTATUS:${this.busyStatus}`,
      ]));

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

    // In addition to the URL being part of the DESCRIPTION field,
    // should we also generate an RFC 5545 URL property?
    if (options.url) {
      const url = ev.url();
      if (url) {
        arr.push('URL:' + appendTrackingToUrl(url, options));
      }
    }

    const trigger = this.getAlarm();
    if (trigger) {
      arr.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Event reminder',
        `${trigger}`,
        'END:VALARM'
      );
    }

    arr.push('END:VEVENT');

    return arr;
  }

  toString(): string {
    return this.getLines().join('\r\n');
  }

  /**
   * fold lines to 75 characters
   */
  getLines(): string[] {
    return this.getLongLines().map(IcalEvent.fold);
  }

  /**
   * fold line to 75 characters
   */
  static fold(line: string): string {
    let isASCII = true;
    for (let i = 0; i < line.length; i++) {
      if (line.charCodeAt(i) > 255) {
        isASCII = false;
        break;
      }
    }
    if (isASCII) {
      if (line.length <= 74) {
        return line;
      }
      const matches = line.match(char74re);
      return matches!.join('\r\n ');
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

  static escape(str: string): string {
    if (str.includes(',')) {
      str = str.replaceAll(',', '\\,');
    }
    if (str.includes(';')) {
      str = str.replaceAll(';', '\\;');
    }
    return str;
  }

  static formatYYYYMMDD(dt: Date): string {
    return (
      pad4(dt.getFullYear()) + pad2(dt.getMonth() + 1) + pad2(dt.getDate())
    );
  }

  /**
   * Returns UTC string for iCalendar
   */
  static makeDtstamp(dt: Date): string {
    const s = dt.toISOString();
    return (
      s.slice(0, 4) +
      s.slice(5, 7) +
      s.slice(8, 13) +
      s.slice(14, 16) +
      s.slice(17, 19) +
      'Z'
    );
  }

  static version(): string {
    return version;
  }
}

/**
 * Transforms a single Event into a VEVENT string
 * @returns multi-line result, delimited by \r\n
 */
export function eventToIcal(ev: Event, options: ICalOptions): string {
  const ical = new IcalEvent(ev, options);
  return ical.toString();
}

const torahMemoCache = new Map();

const HOLIDAY_IGNORE_MASK =
  DAILY_LEARNING |
  flags.OMER_COUNT |
  flags.SHABBAT_MEVARCHIM |
  flags.MOLAD |
  flags.USER_EVENT |
  flags.HEBREW_DATE;

const ESC_NEWLINE = String.raw`\n`;
const DBL_NEWLINE = ESC_NEWLINE + ESC_NEWLINE;

/**
 * @private
 */
function makeTorahMemo(ev: Event, il: boolean): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (ev.getFlags() & HOLIDAY_IGNORE_MASK || (ev as any).eventTime) {
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
  memo = makeTorahMemoText(ev, il).replaceAll('\n', ESC_NEWLINE);
  torahMemoCache.set(key, memo);
  return memo;
}

/**
 * @private
 */
function createMemo(ev: Event, options: ICalOptions): string {
  let memo: string = ev.memo || '';
  if (memo.length && memo.includes('\n')) {
    memo = memo.replaceAll('\n', ESC_NEWLINE);
  }
  const desc = ev.getDesc();
  if (desc === 'Havdalah' || desc === 'Candle lighting') {
    return memo;
  }
  const mask = ev.getFlags();
  if (mask & flags.OMER_COUNT) {
    const omerEv = ev as OmerEvent;
    const sefira = [
      omerEv.sefira('en'),
      omerEv.sefira('he'),
      omerEv.sefira('translit'),
    ].join(ESC_NEWLINE);
    return (
      omerEv.getTodayIs('en') +
      DBL_NEWLINE +
      omerEv.getTodayIs('he') +
      DBL_NEWLINE +
      sefira
    );
  }
  if (!memo) {
    memo = getHolidayDescription(ev);
  }
  if (!memo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkEv = (ev as any).linkedEvent;
    if (linkEv && linkEv.getDesc() !== ev.getDesc()) {
      memo = linkEv.render(options.locale);
    }
  }
  const torahMemo = makeTorahMemo(ev, options.il!);
  if (torahMemo) {
    if (memo.length) {
      memo += DBL_NEWLINE;
    }
    memo += torahMemo;
  }
  const url = appendTrackingToUrl(ev.url(), options);
  if (url) {
    if (memo.length) {
      memo += DBL_NEWLINE;
    }
    memo += url;
  }
  return memo;
}

/**
 * Generates an RFC 2445 iCalendar string from an array of events
 */
export async function eventsToIcalendar(
  events: Event[],
  options: ICalOptions
): Promise<string> {
  if (!events.length) throw new RangeError('Events can not be empty');
  if (!options) throw new TypeError('Invalid options object');
  const opts = {...options};
  opts.dtstamp = opts.dtstamp || IcalEvent.makeDtstamp(new Date());
  if (!opts.title) {
    opts.title = getCalendarTitle(events, opts);
  }
  const icals = events.map(ev => new IcalEvent(ev, opts));
  return icalEventsToString(icals, opts);
}

const localeMap: Record<string, string> = {
  'he-x-NoNikud': 'he',
  'he-x-nonikud': 'he',
  h: 'he',
  a: 'en',
  s: 'en',
  ashkenazi: 'en',
  ashkenazi_romanian: 'ro',
} as const;

/**
 * Generates an RFC 2445 iCalendar string from an array of IcalEvents
 */
export async function icalEventsToString(
  icals: IcalEvent[],
  options: ICalOptions
): Promise<string> {
  if (!icals.length) throw new RangeError('Events can not be empty');
  if (!options) throw new TypeError('Invalid options object');
  const stream = [];
  const locale = options.locale || 'en';
  const lang = locale.length === 2 ? locale : localeMap[locale] || 'en';
  const uclang = lang.toUpperCase();
  const opts = {...options};
  opts.dtstamp = opts.dtstamp || IcalEvent.makeDtstamp(new Date());
  const title = opts.title ? IcalEvent.escape(opts.title) : 'Untitled';
  const caldesc = opts.caldesc
    ? IcalEvent.escape(opts.caldesc)
    : opts.yahrzeit
      ? 'Yahrzeits + Anniversaries from www.hebcal.com'
      : 'Jewish Holidays from www.hebcal.com';
  const prodid =
    opts.prodid ||
    `-//hebcal.com/NONSGML Hebcal Calendar v1${version}//${uclang}`;
  const preamble = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodid}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-LOTUS-CHARSET:UTF-8',
  ];
  if (opts.publishedTTL !== false) {
    const publishedTTL = opts.publishedTTL || 'P7D';
    preamble.push(`REFRESH-INTERVAL;VALUE=DURATION:${publishedTTL}`);
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
      } catch {
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
