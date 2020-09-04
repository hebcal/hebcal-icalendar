/* eslint-disable max-len */
import test from 'ava';
import {HebrewCalendar, Location} from '@hebcal/core';
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
    'CLASS:PUBLIC',
    'SUMMARY:Parashat Tzav',
    'DTSTART;VALUE=DATE:19930403',
    'DTEND;VALUE=DATE:19930404',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-19930403-58f80aa7d21720fc609c3755ac43fad0',
    'DESCRIPTION:Torah: Leviticus 6:1-8:36\\nHaftarah: Malachi 3:4 - 3:24 | Shab',
    ' bat HaGadol\\n\\nhttps://www.hebcal.com/sedrot/tzav?utm_source=js&utm_medium',
    ' =icalendar',
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
    'CLASS:PUBLIC',
    'SUMMARY:Parashat Korach',
    'DTSTART;VALUE=DATE:19930619',
    'DTEND;VALUE=DATE:19930620',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-19930619-9b2c5e5ae7df4d2407ce268cd816063a',
    'DESCRIPTION:Torah: Numbers 16:1-18:32\\nMaftir: Numbers 28:9 - 28:15 | Shab',
    ' bat Rosh Chodesh\\nHaftarah: Isaiah 66:1 - 66:24 | Shabbat Rosh Chodesh\\n\\n',
    ' https://www.hebcal.com/sedrot/korach?utm_source=js&utm_medium=icalendar',
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
    'CLASS:PUBLIC',
    'SUMMARY:Erev Pesach',
    'DTSTART;VALUE=DATE:19930405',
    'DTEND;VALUE=DATE:19930406',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-19930405-6fa29675cbcb1ccb27f62fd980f5e78f',
    'DESCRIPTION:Passover\\, the Feast of Unleavened Bread\\n\\nhttps://www.hebcal',
    ' .com/holidays/pesach?utm_source=js&utm_medium=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  lines = icalendar.eventToIcal(events[1], options).split('\r\n');
  t.is(lines[4], 'SUMMARY:Pesach I');
  t.is(lines[7], 'TRANSP:OPAQUE');

  events[2].memo = memo;
  lines = icalendar.eventToIcal(events[2], options).split('\r\n');
  t.is(lines[4], 'SUMMARY:Pesach II');
  t.is(lines[7], 'TRANSP:OPAQUE');
  lines[1] = 'DTSTAMP:X';
  expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'CLASS:PUBLIC',
    'SUMMARY:Pesach II',
    'DTSTART;VALUE=DATE:19930407',
    'DTEND;VALUE=DATE:19930408',
    'TRANSP:OPAQUE',
    'X-MICROSOFT-CDO-BUSYSTATUS:OOF',
    'UID:hebcal-19930407-a12a5eb5a4d96cc7ee7b51960527dfa3',
    'DESCRIPTION:Passover\\, the Feast of Unleavened Bread\\nTorah: Leviticus 22:',
    ' 26-23:44\\nHaftarah: II Kings 23:1 - 23:9\\; 23:21 - 23:25\\n\\nhttps://www.he',
    ' bcal.com/holidays/pesach?utm_source=js&utm_medium=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  lines = icalendar.eventToIcal(events[3], options).split('\r\n');
  t.is(lines[4], 'SUMMARY:Pesach III (CH\'\'M)');
  t.is(lines[7], 'TRANSP:TRANSPARENT');
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
  t.is(lines.length, 18);
  t.is(lines[0], 'BEGIN:VEVENT');
  t.is(lines[4], 'SUMMARY:Candle lighting');
  t.is(lines[17], 'END:VEVENT');
  const dtstart = lines[5];
  t.is(dtstart.startsWith('DTSTART'), true);
  t.is(dtstart.indexOf('TZID='), 8);
  t.is(dtstart.substring(dtstart.indexOf(':') + 1), '19930305T172700');
  const dtend = lines[6];
  t.is(dtend.startsWith('DTEND'), true);
  t.is(dtend.substring(dtend.indexOf(':') + 1), '19930305T172700');
  t.is(lines[15], 'TRIGGER;RELATED=START:-PT10M');
  t.is(lines[10], 'LOCATION:Chicago');

  const havdalah = icalendar.eventToIcal(events[1], options);
  lines = havdalah.split('\r\n');
  t.is(lines.length, 13);
  t.is(lines[0], 'BEGIN:VEVENT');
  t.is(lines[4], 'SUMMARY:Havdalah');
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
    'CLASS:PUBLIC',
    'SUMMARY:נדרים 14',
    'DTSTART;VALUE=DATE:19930301',
    'DTEND;VALUE=DATE:19930302',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-19930301-eb88cd2cc7b514690d416285f89cc65a',
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
  t.is(lines[4], 'SUMMARY:1st day of the Omer');
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
    'CLASS:PUBLIC',
    'SUMMARY:Chanukah: 1 Candle',
    'DTSTART;TZID=America/New_York:20201210T165800',
    'DTEND;TZID=America/New_York:20201210T165800',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'UID:hebcal-20201210-bdae7298ae4a99dede01a740670ebcf8-boston',
    'DESCRIPTION:Hanukkah\\, the Jewish festival of rededication. Also known as ',
    ' the Festival of Lights\\n\\nhttps://www.hebcal.com/holidays/chanukah?utm_sou',
    ' rce=js&utm_medium=icalendar',
    'LOCATION:Boston',
    'GEO:42.35843;-71.05977',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});
