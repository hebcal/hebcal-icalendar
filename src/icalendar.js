/* eslint-disable max-len */
import {flags, Locale} from '@hebcal/core';
import fnv from 'fnv-plus';
import {pad2, getCalendarTitle, renderTitleWithoutTime, makeAnchor,
  getHolidayDescription, makeTorahMemoText} from '@hebcal/rest-api';
import fs from 'fs';
import {Writable} from 'stream';
import {version} from '../package.json';

const VTIMEZONE = {
  'US/Eastern': 'BEGIN:VTIMEZONE\r\nTZID:US/Eastern\r\nBEGIN:STANDARD\r\nDTSTART:19701101T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\nTZOFFSETTO:-0500\r\nTZOFFSETFROM:-0400\r\nTZNAME:EST\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19700308T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\r\nTZOFFSETTO:-0400\r\nTZOFFSETFROM:-0500\r\nTZNAME:EDT\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE',
  'US/Central': 'BEGIN:VTIMEZONE\r\nTZID:US/Central\r\nBEGIN:STANDARD\r\nDTSTART:19701101T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\nTZOFFSETTO:-0600\r\nTZOFFSETFROM:-0500\r\nTZNAME:CST\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19700308T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\r\nTZOFFSETTO:-0500\r\nTZOFFSETFROM:-0600\r\nTZNAME:CDT\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE',
  'US/Mountain': 'BEGIN:VTIMEZONE\r\nTZID:US/Mountain\r\nBEGIN:STANDARD\r\nDTSTART:19701101T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\nTZOFFSETTO:-0700\r\nTZOFFSETFROM:-0600\r\nTZNAME:MST\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19700308T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\r\nTZOFFSETTO:-0600\r\nTZOFFSETFROM:-0700\r\nTZNAME:MDT\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE',
  'US/Pacific': 'BEGIN:VTIMEZONE\r\nTZID:US/Pacific\r\nX-MICROSOFT-CDO-TZID:13\r\nBEGIN:STANDARD\r\nDTSTART:19701101T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\nTZOFFSETFROM:-0700\r\nTZOFFSETTO:-0800\r\nTZNAME:PST\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19700308T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\r\nTZOFFSETFROM:-0800\r\nTZOFFSETTO:-0700\r\nTZNAME:PDT\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE',
  'US/Alaska': 'BEGIN:VTIMEZONE\r\nTZID:US/Alaska\r\nBEGIN:STANDARD\r\nDTSTART:19701101T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\nTZOFFSETTO:-0900\r\nTZOFFSETFROM:+0000\r\nTZNAME:AKST\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19700308T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\r\nTZOFFSETTO:-0800\r\nTZOFFSETFROM:-0900\r\nTZNAME:AKDT\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE',
  'US/Hawaii': 'BEGIN:VTIMEZONE\r\nTZID:US/Hawaii\r\nLAST-MODIFIED:20060309T044821Z\r\nBEGIN:DAYLIGHT\r\nDTSTART:19330430T123000\r\nTZOFFSETTO:-0930\r\nTZOFFSETFROM:+0000\r\nTZNAME:HDT\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nDTSTART:19330521T020000\r\nTZOFFSETTO:-1030\r\nTZOFFSETFROM:-0930\r\nTZNAME:HST\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19420209T020000\r\nTZOFFSETTO:-0930\r\nTZOFFSETFROM:-1030\r\nTZNAME:HWT\r\nEND:DAYLIGHT\r\nBEGIN:DAYLIGHT\r\nDTSTART:19450814T133000\r\nTZOFFSETTO:-0930\r\nTZOFFSETFROM:-0930\r\nTZNAME:HPT\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nDTSTART:19450930T020000\r\nTZOFFSETTO:-1030\r\nTZOFFSETFROM:-0930\r\nTZNAME:HST\r\nEND:STANDARD\r\nBEGIN:STANDARD\r\nDTSTART:19470608T020000\r\nTZOFFSETTO:-1000\r\nTZOFFSETFROM:-1030\r\nTZNAME:HST\r\nEND:STANDARD\r\nEND:VTIMEZONE',
  'US/Aleutian': 'BEGIN:VTIMEZONE\r\nTZID:US/Aleutian\r\nBEGIN:STANDARD\r\nDTSTART:19701101T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\nTZOFFSETTO:-1000\r\nTZOFFSETFROM:-0900\r\nTZNAME:HAST\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19700308T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\r\nTZOFFSETTO:-0900\r\nTZOFFSETFROM:-1000\r\nTZNAME:HADT\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE',
  'America/Phoenix': 'BEGIN:VTIMEZONE\r\nTZID:America/Phoenix\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETTO:-0700\r\nTZOFFSETFROM:-0700\r\nEND:STANDARD\r\nEND:VTIMEZONE',
};

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

/**
 * Transforms a single Event into a VEVENT string
 * @param {Event} e
 * @param {HebcalOptions} options
 * @return {string} multi-line result, delimited by \r\n
 */
export function eventToIcal(e, options) {
  const dtstamp = options.dtstamp || makeDtstamp(new Date());
  const timed = Boolean(e.eventTime);
  let subj = timed ? renderTitleWithoutTime(e) : e.render();
  const desc = e.getDesc(); // original untranslated
  const mask = e.getFlags();
  const candles = (desc === 'Havdalah' || desc === 'Candle lighting');
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

  const date = formatYYYYMMDD(e.getDate().greg());
  let startDate = date;
  let dtargs; let endDate;
  let transp = 'TRANSPARENT'; let busyStatus = 'FREE';
  if (timed) {
    let [hour, minute] = e.eventTimeStr.split(':');
    hour = +hour;
    minute = +minute;
    startDate += 'T' + pad2(hour) + pad2(minute) + '00';
    endDate = startDate;
    dtargs = `;TZID=${options.location.tzid}`;
  } else {
    endDate = formatYYYYMMDD(e.getDate().next().greg());
    // for all-day untimed, use DTEND;VALUE=DATE intsead of DURATION:P1D.
    // It's more compatible with everthing except ancient versions of
    // Lotus Notes circa 2004
    dtargs = ';VALUE=DATE';
    if (mask & flags.CHAG) {
      transp = 'OPAQUE';
      busyStatus = 'OOF';
    }
  }

  const digest = fnv.fast1a52hex(desc);
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
    const hebrew = e.renderBrief('he');
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
  const memo = candles ? '' : createMemo(e, options.il);
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

  // fold lines to 75 characters
  const char74re = /(.{1,74})/g;
  return arr.map((line) => {
    return line.length <= 74 ? line : line.match(char74re).join('\r\n ');
  }).join('\r\n');
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
 * @param {NodeJS.WritableStream} stream
 * @param {Event[]} events
 * @param {HebcalOptions} options
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
    stream.write(line);
    stream.write('\r\n');
  });
  if (options.relcalid) {
    stream.write(`X-WR-RELCALID:${options.relcalid}\r\n`);
  }
  const location = options.location;
  if (location && location.tzid) {
    const tzid = location.tzid;
    stream.write(`X-WR-TIMEZONE;VALUE=TEXT:${tzid}\r\n`);
    if (VTIMEZONE[tzid]) {
      stream.write(VTIMEZONE[tzid]);
      stream.write('\r\n');
    } else {
      try {
        const vtimezoneIcs = `./zoneinfo/${tzid}.ics`;
        const lines = fs.readFileSync(vtimezoneIcs, 'utf-8').split('\r\n');
        // ignore first 3 and last 1 lines
        const str = lines.slice(3, lines.length - 2).join('\r\n');
        stream.write(str);
        stream.write('\r\n');
        VTIMEZONE[tzid] = str; // cache for later
      } catch (error) {
        // ignore failure when no timezone definition to read
      }
    }
  }

  options.dtstamp = makeDtstamp(new Date());
  events.forEach((e) => {
    stream.write(eventToIcal(e, options));
    stream.write('\r\n');
  });
  stream.write('END:VCALENDAR\r\n');
  stream.end();
}

/**
 * Renders an array of events as a full RFC 2445 iCalendar string
 * @param {Event[]} events
 * @param {HebcalOptions} options
 * @return {string} multi-line result, delimited by \r\n
 */
export async function eventsToIcalendar(events, options) {
  const writable = new Writable();
  const chunks = [];
  writable._write = function(chunk, encoding, next) {
    chunks.push(chunk);
    next();
  };
  eventsToIcalendarStream(writable, events, options);
  return Buffer.concat(chunks).toString('utf8');
}
