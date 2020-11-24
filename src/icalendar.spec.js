/* eslint-disable max-len */
import test from 'ava';
import {HebrewCalendar, Location, HDate, Event, flags, HebrewDateEvent} from '@hebcal/core';
import * as icalendar from './icalendar';

test('ical-sedra', (t) => {
  const options = {year: 1993, month: 4, sedrot: true, noHolidays: true};
  const events = HebrewCalendar.calendar(options);
  const tzav = icalendar.eventToIcal(events[0], options);
  let lines = tzav.split('\r\n');
  lines[1] = 'DTSTAMP:X';
  let expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:Parashat Tzav',
    'DTSTART;VALUE=DATE:19930403',
    'DTEND;VALUE=DATE:19930404',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-19930403-58f80aa7d21720fc609c3755ac43fad0',
    'CLASS:PUBLIC',
    'DESCRIPTION:Torah: Leviticus 6:1-8:36\\nHaftarah: Malachi 3:4 - 3:24 | Shab',
    ' bat HaGadol\\n\\nhttps://www.hebcal.com/sedrot/tzav-19930403?utm_source=js&u',
    ' tm_medium=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  const options2 = {year: 1993, month: 6, sedrot: true, noHolidays: true};
  const events2 = HebrewCalendar.calendar(options2);
  const korach = icalendar.eventToIcal(events2[2], options);
  lines = korach.split('\r\n');
  lines[1] = 'DTSTAMP:X';
  expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:Parashat Korach',
    'DTSTART;VALUE=DATE:19930619',
    'DTEND;VALUE=DATE:19930620',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-19930619-9b2c5e5ae7df4d2407ce268cd816063a',
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
  };
  const events = HebrewCalendar.calendar(options);
  const memo = 'Passover, the Feast of Unleavened Bread';
  events[0].memo = memo;
  let lines = icalendar.eventToIcal(events[0], options).split('\r\n');
  lines[1] = 'DTSTAMP:X';
  let expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:Erev Pesach',
    'DTSTART;VALUE=DATE:19930405',
    'DTEND;VALUE=DATE:19930406',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-19930405-6fa29675cbcb1ccb27f62fd980f5e78f',
    'CLASS:PUBLIC',
    'DESCRIPTION:Passover\\, the Feast of Unleavened Bread\\n\\nhttps://www.hebcal',
    ' .com/holidays/pesach-1993?utm_source=js&utm_medium=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  lines = icalendar.eventToIcal(events[1], options).split('\r\n');
  t.is(lines[3], 'SUMMARY:Pesach I');
  t.is(lines[6], 'TRANSP:OPAQUE');

  events[2].memo = memo;
  lines = icalendar.eventToIcal(events[2], options).split('\r\n');
  lines[1] = 'DTSTAMP:X';
  expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:Pesach II',
    'DTSTART;VALUE=DATE:19930407',
    'DTEND;VALUE=DATE:19930408',
    'TRANSP:OPAQUE',
    'X-MICROSOFT-CDO-BUSYSTATUS:OOF',
    'UID:hebcal-19930407-a12a5eb5a4d96cc7ee7b51960527dfa3',
    'CLASS:PUBLIC',
    'DESCRIPTION:Passover\\, the Feast of Unleavened Bread\\nTorah: Leviticus 22:',
    ' 26-23:44\\; Numbers 28:16-28:25\\nHaftarah: II Kings 23:1 - 23:9\\; 23:21 - 2',
    ' 3:25\\n\\nhttps://www.hebcal.com/holidays/pesach-1993?utm_source=js&utm_medi',
    ' um=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  lines = icalendar.eventToIcal(events[3], options).split('\r\n');
  t.is(lines[3], 'SUMMARY:Pesach III (CH\'\'M)');
  t.is(lines[6], 'TRANSP:TRANSPARENT');
});

test('ical-candles', (t) => {
  const options = {
    year: 1993,
    month: 3,
    location: new Location(41.85003, -87.65005, false, 'America/Chicago', 'Chicago', 'US', 4887398),
    candlelighting: true,
    noHolidays: true,
  };
  const events = HebrewCalendar.calendar(options);
  const ical = icalendar.eventToIcal(events[0], options);
  let lines = ical.split('\r\n');
  lines[1] = 'DTSTAMP:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:Candle lighting',
    'DTSTART;TZID=America/Chicago:19930305T172700',
    'DTEND;TZID=America/Chicago:19930305T172700',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-19930305-cac1aa4933d054b960677b3a4a2254b3-4887398',
    'CLASS:PUBLIC',
    'LOCATION:Chicago',
    'GEO:41.85003;-87.65005',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:REMINDER',
    'TRIGGER;RELATED=START:-PT10M',
    'END:VALARM',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  const havdalah = icalendar.eventToIcal(events[1], options);
  lines = havdalah.split('\r\n');
  t.is(lines.length, 13);
  t.is(lines[0], 'BEGIN:VEVENT');
  t.is(lines[3], 'SUMMARY:Havdalah');
  t.is(lines[10], 'LOCATION:Chicago');
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
  const ical = icalendar.eventToIcal(ev, options);
  const lines = ical.split('\r\n');
  lines[1] = 'DTSTAMP:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:נדרים 14',
    'DTSTART;VALUE=DATE:19930301',
    'DTEND;VALUE=DATE:19930302',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-19930301-eb88cd2cc7b514690d416285f89cc65a',
    'CLASS:PUBLIC',
    'DESCRIPTION:https://www.sefaria.org/Nedarim.14a?lang=bi&utm_source=hebcal.',
    ' com&utm_medium=icalendar',
    'LOCATION:דף יומי',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('ical-omer', (t) => {
  const options = {year: 1993, noHolidays: true, omer: true};
  const ev = HebrewCalendar.calendar(options)[0];
  const ical = icalendar.eventToIcal(ev, options);
  const lines = ical.split('\r\n');
  t.is(lines.length, 16);
  t.is(lines[3], 'SUMMARY:1st day of the Omer');
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
  const ical = await icalendar.eventsToIcalendar(events, options);
  t.is(ical.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'), true);
});

test('appendHebrewToSubject', (t) => {
  const options = {
    start: new Date(2020, 4, 23),
    end: new Date(2020, 4, 30),
    sedrot: true,
    candlelighting: true,
    location: Location.lookup('Gibraltar'),
    appendHebrewToSubject: true,
  };
  const events = HebrewCalendar.calendar(options);
  const icals = events.map((ev) => icalendar.eventToIcal(ev, options));
  const summary = icals.map((i) => i.split('\r\n').find((s) => s.startsWith('SUMMARY')));
  const expected = [
    'SUMMARY:Parashat Bamidbar / פרשת בְּמִדְבַּר',
    'SUMMARY:Havdalah / הַבדָלָה',
    'SUMMARY:Rosh Chodesh Sivan / רֹאשׁ חודש סִיוָן',
    'SUMMARY:Erev Shavuot / עֶרֶב שָׁבוּעוֹת',
    'SUMMARY:Candle lighting / הדלקת נרות',
    'SUMMARY:Shavuot I / שָׁבוּעוֹת יוֹם א׳',
    'SUMMARY:Candle lighting / הדלקת נרות',
    'SUMMARY:Shavuot II / שָׁבוּעוֹת יוֹם ב׳',
    'SUMMARY:Havdalah / הַבדָלָה',
  ];
  t.deepEqual(summary, expected);
});

test('chanukah-candles', (t) => {
  const options = {
    start: new Date(2020, 11, 10),
    end: new Date(2020, 11, 10),
    location: Location.lookup('Boston'),
    candlelighting: true,
  };
  const events = HebrewCalendar.calendar(options);
  const ical = icalendar.eventToIcal(events[0], options);
  const lines = ical.split('\r\n');
  lines[1] = 'DTSTAMP:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:Chanukah: 1 Candle',
    'DTSTART;TZID=America/New_York:20201210T165800',
    'DTEND;TZID=America/New_York:20201210T165800',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-20201210-bdae7298ae4a99dede01a740670ebcf8-boston',
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
  };
  const events = HebrewCalendar.calendar(options);
  const ical = icalendar.eventToIcal(events[0], options);
  const lines = ical.split('\r\n');
  lines[1] = 'DTSTAMP:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:Shmini Atzeret',
    'DTSTART;VALUE=DATE:20210928',
    'DTEND;VALUE=DATE:20210929',
    'TRANSP:OPAQUE',
    'X-MICROSOFT-CDO-BUSYSTATUS:OOF',
    'UID:hebcal-20210928-6da05ddf411dec94bb214fbf867a32ab',
    'CLASS:PUBLIC',
    'DESCRIPTION:Eighth Day of Assembly\\nTorah: Deuteronomy 33:1-34:12\\; Number',
    ' s 29:35-30:1\\nHaftarah: Joshua 1:1 - 1:18\\n\\nhttps://www.hebcal.com/holida',
    ' ys/shmini-atzeret-2021?i=on&utm_source=js&utm_medium=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('userEvent', (t) => {
  const hd = new HDate(new Date(2021, 1, 13));
  const userEvent = new Event(hd, 'User Event', flags.USER_EVENT);
  const ical = icalendar.eventToIcal(userEvent, {yahrzeit: true});
  const lines = ical.split('\r\n');
  lines[1] = 'DTSTAMP:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Personal',
    'SUMMARY:User Event',
    'DTSTART;VALUE=DATE:20210213',
    'DTEND;VALUE=DATE:20210214',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-20210213-04d0702c162e8ab6a9fde39a4cc1870a',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:REMINDER',
    'TRIGGER;RELATED=START:-PT12H',
    'END:VALARM',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('relcalid', async (t) => {
  const event = new HebrewDateEvent(new HDate(new Date(2021, 1, 13)));
  const relcalid = '01enedk40bytfd4enm1673bdqh';
  const ical = await icalendar.eventsToIcalendar([event], {relcalid});
  const lines = ical.split('\r\n');
  lines[2] = 'PRODID:X';
  lines[11] = 'DTSTAMP:X';
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
    'CATEGORIES:Holiday',
    'SUMMARY:1st of Adar\\, 5781',
    'DTSTART;VALUE=DATE:20210213',
    'DTEND;VALUE=DATE:20210214',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-20210213-544ebefff60374db469c47d31d033731',
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
  };
  const events = HebrewCalendar.calendar(options);
  const icals = events.map((ev) => icalendar.eventToIcal(ev, options));
  const summary = icals.map((i) => i.split('\r\n').find((s) => s.startsWith('SUMMARY')));
  const expected = [
    'SUMMARY:Fast begins',
    'SUMMARY:Tzom Tammuz',
    'SUMMARY:Fast ends',
  ];
  t.deepEqual(summary, expected);
});
