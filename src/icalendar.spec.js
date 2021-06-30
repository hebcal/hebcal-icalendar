/* eslint-disable max-len */
import test from 'ava';
import {HebrewCalendar, Location, HDate, Event, flags,
  HebrewDateEvent, OmerEvent} from '@hebcal/core';
import {IcalEvent, eventsToIcalendar} from './icalendar';

/**
 * @private
 * @param {string[]} lines
 * @param {string} propName
 * @return {string}
 */
function findLine(lines, propName) {
  const line = lines.find((line) => line.startsWith(propName));
  if (line) {
    return line.substring(line.indexOf(':') + 1);
  }
  return null;
}

test('ical-sedra', (t) => {
  const options = {year: 1993, month: 4, sedrot: true, noHolidays: true};
  const events = HebrewCalendar.calendar(options);
  const tzav = new IcalEvent(events[0], options);
  let lines = tzav.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  let expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Parsha',
    'SUMMARY:Parashat Tzav',
    'DTSTART;VALUE=DATE:19930403',
    'DTEND;VALUE=DATE:19930404',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Torah: Leviticus 6:1-8:36\\nHaftarah: Malachi 3:4 - 3:24 | Shab',
    ' bat HaGadol\\n\\nhttps://www.hebcal.com/sedrot/tzav-19930403?utm_source=js&u',
    ' tm_medium=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  const options2 = {year: 1993, month: 6, sedrot: true, noHolidays: true};
  const events2 = HebrewCalendar.calendar(options2);
  const korach = new IcalEvent(events2[2], options);
  lines = korach.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Parsha',
    'SUMMARY:Parashat Korach',
    'DTSTART;VALUE=DATE:19930619',
    'DTEND;VALUE=DATE:19930620',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Torah: Numbers 16:1-18:32\\nMaftir: Numbers 28:9 - 28:15 | Shab',
    ' bat Rosh Chodesh\\nHaftarah: Isaiah 66:1 - 66:24 | Shabbat Rosh Chodesh\\n\\n',
    ' https://www.hebcal.com/sedrot/korach-19930619?utm_source=js&utm_medium=ica',
    ' lendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('ical-transp-opaque', (t) => {
  const options = {
    year: 1993,
    month: 4,
    noMinorFast: true,
    noRoshChodesh: true,
    noSpecialShabbat: true,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const memo = 'Passover, the Feast of Unleavened Bread';
  events[0].memo = memo;
  let lines = new IcalEvent(events[0], options).toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  let expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:✡️ Erev Pesach',
    'DTSTART;VALUE=DATE:19930405',
    'DTEND;VALUE=DATE:19930406',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Passover\\, the Feast of Unleavened Bread\\n\\nhttps://www.hebcal',
    ' .com/holidays/pesach-1993?utm_source=js&utm_medium=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  lines = new IcalEvent(events[1], options).toString().split('\r\n');
  t.is(findLine(lines, 'SUMMARY'), '✡️ Pesach I');
  t.is(findLine(lines, 'TRANSP'), 'OPAQUE');

  events[2].memo = memo;
  lines = new IcalEvent(events[2], options).toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:✡️ Pesach II',
    'DTSTART;VALUE=DATE:19930407',
    'DTEND;VALUE=DATE:19930408',
    'UID:X',
    'TRANSP:OPAQUE',
    'X-MICROSOFT-CDO-BUSYSTATUS:OOF',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Passover\\, the Feast of Unleavened Bread\\n\\nTorah: Leviticus 2',
    ' 2:26-23:44\\; Numbers 28:16-28:25\\nHaftarah: II Kings 23:1 - 23:9\\; 23:21 -',
    '  23:25\\n\\nhttps://www.hebcal.com/holidays/pesach-1993?utm_source=js&utm_me',
    ' dium=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  lines = new IcalEvent(events[3], options).toString().split('\r\n');
  t.is(findLine(lines, 'SUMMARY'), '✡️ Pesach III (CH\'\'M)');
  t.is(findLine(lines, 'TRANSP'), 'TRANSPARENT');
});

test('ical-candles', (t) => {
  const options = {
    year: 1993,
    month: 3,
    location: new Location(41.85003, -87.65005, false, 'America/Chicago', 'Chicago', 'US', 4887398),
    candlelighting: true,
    noHolidays: true,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const ical = new IcalEvent(events[0], options);
  let lines = ical.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:🕯️ Candle lighting',
    'DTSTART;TZID=America/Chicago:19930305T172700',
    'DTEND;TZID=America/Chicago:19930305T172700',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'CLASS:PUBLIC',
    'LOCATION:Chicago',
    'GEO:41.85003;-87.65005',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:This is an event reminder',
    'TRIGGER:-P0DT0H10M0S',
    'END:VALARM',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  const havdalah = new IcalEvent(events[1], options);
  lines = havdalah.toString().split('\r\n');
  t.is(lines.length, 13);
  t.is(lines[0], 'BEGIN:VEVENT');
  t.is(findLine(lines, 'SUMMARY'), '🌃 Havdalah');
  t.is(findLine(lines, 'LOCATION'), 'Chicago');
});

test('ical-dafyomi', (t) => {
  const options = {
    year: 1993,
    month: 3,
    noHolidays: true,
    dafyomi: true,
    locale: 'he',
  };
  const ev = HebrewCalendar.calendar(options)[0];
  t.is(ev.render(), 'דף יומי: נדרים 14');
  const ical = new IcalEvent(ev, options);
  const lines = ical.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Daf Yomi',
    'SUMMARY:נדרים 14',
    'DTSTART;VALUE=DATE:19930301',
    'DTEND;VALUE=DATE:19930302',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:https://www.sefaria.org/Nedarim.14a?lang=bi&utm_source=hebcal.',
    ' com&utm_medium=icalendar',
    'LOCATION:דף יומי',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('ical-omer', (t) => {
  const options = {year: 1993, noHolidays: true, omer: true, emoji: true};
  const ev = HebrewCalendar.calendar(options)[0];
  const ical = new IcalEvent(ev, options);
  const lines = ical.toString().split('\r\n');
  t.is(lines.length, 16);
  t.is(findLine(lines, 'SUMMARY'), '0️⃣1️⃣ 1st day of the Omer');
});

test('eventsToIcalendar', async (t) => {
  const options = {
    year: 2020,
    month: 2,
    sedrot: true,
    candlelighting: true,
    location: Location.lookup('Hawaii'),
  };
  const events = HebrewCalendar.calendar(options);
  const ical = await eventsToIcalendar(events, options);
  const lines = ical.split('\r\n').slice(0, 12);
  lines[2] = 'PRODID:X';
  const expected = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:X',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-LOTUS-CHARSET:UTF-8',
    'X-PUBLISHED-TTL:PT7D',
    'X-WR-CALNAME:Hebcal Hawaii February 2020',
    'X-WR-CALDESC:Jewish Holidays from www.hebcal.com',
    'X-WR-TIMEZONE;VALUE=TEXT:Pacific/Honolulu',
    'BEGIN:VTIMEZONE',
    'TZID:Pacific/Honolulu',
  ];
  t.deepEqual(lines, expected);
});

test('eventsToIcalendar-no-vtimezone', async (t) => {
  const options = {
    year: 2020,
    month: 2,
    sedrot: true,
    candlelighting: true,
    location: Location.lookup('Boston'),
  };
  const events = HebrewCalendar.calendar(options);
  const ical = await eventsToIcalendar(events, options);
  const lines = ical.split('\r\n').slice(0, 11);
  lines[2] = 'PRODID:X';
  const expected = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:X',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-LOTUS-CHARSET:UTF-8',
    'X-PUBLISHED-TTL:PT7D',
    'X-WR-CALNAME:Hebcal Boston February 2020',
    'X-WR-CALDESC:Jewish Holidays from www.hebcal.com',
    'X-WR-TIMEZONE;VALUE=TEXT:America/New_York',
    'BEGIN:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('appendHebrewToSubject', (t) => {
  const options = {
    start: new Date(2020, 4, 23),
    end: new Date(2020, 4, 30),
    sedrot: true,
    candlelighting: true,
    location: Location.lookup('Gibraltar'),
    appendHebrewToSubject: true,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const icals = events.map((ev) => new IcalEvent(ev, options));
  const summary = icals.map((i) => i.toString().split('\r\n').find((s) => s.startsWith('SUMMARY')));
  const expected = [
    'SUMMARY:Parashat Bamidbar / פרשת בְּמִדְבַּר',
    'SUMMARY:🌃 Havdalah / הַבדָלָה',
    'SUMMARY:🌒 Rosh Chodesh Sivan / רֹאשׁ חוֹדֶשׁ סִיוָן',
    'SUMMARY:⛰️🌸 Erev Shavuot / עֶרֶב שָׁבוּעוֹת',
    'SUMMARY:🕯️ Candle lighting / הַדלָקָת נֵרוֹת',
    'SUMMARY:⛰️🌸 Shavuot I / שָׁבוּעוֹת יוֹם א׳',
    'SUMMARY:🕯️ Candle lighting / הַדלָקָת נֵרוֹת',
    'SUMMARY:⛰️🌸 Shavuot II / שָׁבוּעוֹת יוֹם ב׳',
    'SUMMARY:🌃 Havdalah / הַבדָלָה',
  ];
  t.deepEqual(summary, expected);
});

test('chanukah-candles', (t) => {
  const options = {
    start: new Date(2020, 11, 10),
    end: new Date(2020, 11, 10),
    location: Location.lookup('Boston'),
    candlelighting: true,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const ical = new IcalEvent(events[0], options);
  const lines = ical.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:🕎1️⃣ Chanukah: 1 Candle',
    'DTSTART;TZID=America/New_York:20201210T164300',
    'DTEND;TZID=America/New_York:20201210T164300',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Hanukkah\\, the Jewish festival of rededication. Also known as ',
    ' the Festival of Lights\\n\\nhttps://www.hebcal.com/holidays/chanukah-2020?ut',
    ' m_source=js&utm_medium=icalendar',
    'LOCATION:Boston',
    'GEO:42.35843;-71.05977',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('ical-il-url', (t) => {
  const options = {
    start: new Date(2021, 8, 28),
    end: new Date(2021, 8, 28),
    il: true,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const ical = new IcalEvent(events[0], options);
  const lines = ical.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:✡️ Shmini Atzeret',
    'DTSTART;VALUE=DATE:20210928',
    'DTEND;VALUE=DATE:20210929',
    'UID:X',
    'TRANSP:OPAQUE',
    'X-MICROSOFT-CDO-BUSYSTATUS:OOF',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Eighth Day of Assembly\\n\\nTorah: Deuteronomy 33:1-34:12\\; Numb',
    ' ers 29:35-30:1\\nHaftarah: Joshua 1:1 - 1:18\\n\\nhttps://www.hebcal.com/holi',
    ' days/shmini-atzeret-2021?i=on&utm_source=js&utm_medium=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('userEvent', (t) => {
  const hd = new HDate(new Date(2021, 1, 13));
  const userEvent = new Event(hd, 'User Event', flags.USER_EVENT);
  userEvent.uid = 'foo-bar-baaz';
  const ical = new IcalEvent(userEvent, {yahrzeit: true});
  const lines = ical.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Personal',
    'SUMMARY:User Event',
    'DTSTART;VALUE=DATE:20210213',
    'DTEND;VALUE=DATE:20210214',
    'UID:foo-bar-baaz',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:This is an event reminder',
    'TRIGGER:-P0DT12H0M0S',
    'END:VALARM',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('relcalid', async (t) => {
  const event = new HebrewDateEvent(new HDate(new Date(2021, 1, 13)));
  const relcalid = '01enedk40bytfd4enm1673bdqh';
  const ical = await eventsToIcalendar([event], {relcalid});
  const lines = ical.split('\r\n');
  lines[2] = 'PRODID:X';
  lines[11] = 'DTSTAMP:X';
  lines[15] = 'UID:X';
  const expected = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:X',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-LOTUS-CHARSET:UTF-8',
    'X-PUBLISHED-TTL:PT7D',
    'X-WR-CALNAME:Hebcal Diaspora February 2021',
    'X-WR-CALDESC:Jewish Holidays from www.hebcal.com',
    `X-WR-RELCALID:${relcalid}`,
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'SUMMARY:1st of Adar\\, 5781',
    'DTSTART;VALUE=DATE:20210213',
    'DTEND;VALUE=DATE:20210214',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];
  t.deepEqual(lines, expected);
});

test('fastStartEnd', (t) => {
  const options = {
    start: new Date(2021, 5, 27),
    end: new Date(2021, 5, 27),
    location: Location.lookup('Providence'),
    candlelighting: true,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const icals = events.map((ev) => new IcalEvent(ev, options)).map((i) => i.toString());
  const actual = icals.map((s) => s.split('\r\n').filter((s) => {
    return s.startsWith('SUMMARY') || s.startsWith('DTSTART') || s.startsWith('DESCRIPTION');
  }));
  const expected = [
    [
      'SUMMARY:Fast begins',
      'DTSTART;TZID=America/New_York:20210627T032000',
      'DESCRIPTION:Tzom Tammuz',
    ],
    [
      'SUMMARY:✡️ Tzom Tammuz',
      'DTSTART;VALUE=DATE:20210627',
      'DESCRIPTION:Fast commemorating breaching of the walls of Jerusalem before ',
    ],
    [
      'SUMMARY:Fast ends',
      'DTSTART;TZID=America/New_York:20210627T210700',
      'DESCRIPTION:Tzom Tammuz',
    ],
  ];
  t.deepEqual(actual, expected);
});

test('publishedTTL', async (t) => {
  const event = new HebrewDateEvent(new HDate(new Date(2021, 1, 13)));
  const ical = await eventsToIcalendar([event], {publishedTTL: 'PT2D'});
  const lines = ical.split('\r\n');
  t.is(lines[6], 'X-PUBLISHED-TTL:PT2D');
});

test('OmerEvent', (t) => {
  const ev = new OmerEvent(new HDate(22, 'Iyyar', 5781), 37);
  const icalEvent = new IcalEvent(ev, {emoji: true});
  const lines = icalEvent.toString().split('\r\n');
  t.is(findLine(lines, 'SUMMARY'), '3️⃣7️⃣ 37th day of the Omer');
});
