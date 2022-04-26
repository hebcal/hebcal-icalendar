/* eslint-disable max-len */
import test from 'ava';
import {HebrewCalendar, Location, HDate, Event, flags,
  DafYomiEvent, ParshaEvent,
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
    'DESCRIPTION:Torah: Leviticus 6:1-8:36\\nHaftarah: Malachi 3:4-24 | Shabbat ',
    ' HaGadol\\n\\nhttps://hebcal.com/s/tzav-19930403?us=js&um=icalendar',
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
    'DESCRIPTION:Torah: Numbers 16:1-18:32\\, 28:9-15\\nHaftarah: Isaiah 66:1-24 ',
    ' | Shabbat Rosh Chodesh\\n\\nhttps://hebcal.com/s/korach-19930619?us=js&um=ic',
    ' alendar',
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
    'SUMMARY:🫓🍷 Erev Pesach',
    'DTSTART;VALUE=DATE:19930405',
    'DTEND;VALUE=DATE:19930406',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Passover\\, the Feast of Unleavened Bread\\n\\nhttps://hebcal.com',
    ' /h/pesach-1993?us=js&um=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  lines = new IcalEvent(events[1], options).toString().split('\r\n');
  t.is(findLine(lines, 'SUMMARY'), '🫓🍷 Pesach I');
  t.is(findLine(lines, 'TRANSP'), 'OPAQUE');

  events[2].memo = memo;
  lines = new IcalEvent(events[2], options).toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:🫓 Pesach II',
    'DTSTART;VALUE=DATE:19930407',
    'DTEND;VALUE=DATE:19930408',
    'UID:X',
    'TRANSP:OPAQUE',
    'X-MICROSOFT-CDO-BUSYSTATUS:OOF',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Passover\\, the Feast of Unleavened Bread\\n\\nTorah: Leviticus 2',
    ' 2:26-23:44\\; Numbers 28:16-25\\nHaftarah: II Kings 23:1-9\\, 23:21-25\\n\\nhtt',
    ' ps://hebcal.com/h/pesach-1993?us=js&um=icalendar',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  lines = new IcalEvent(events[3], options).toString().split('\r\n');
  t.is(findLine(lines, 'SUMMARY'), '🫓 Pesach III (CH\'\'M)');
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
    'DESCRIPTION:Event reminder',
    'TRIGGER:-P0DT0H10M0S',
    'END:VALARM',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);

  const havdalah = new IcalEvent(events[1], options);
  lines = havdalah.toString().split('\r\n');
  t.is(lines.length, 13);
  t.is(lines[0], 'BEGIN:VEVENT');
  t.is(findLine(lines, 'SUMMARY'), '✨ Havdalah');
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

test('eventsToIcalendar', async (t) => {
  const options = {
    year: 2020,
    month: 2,
    sedrot: true,
    candlelighting: true,
    location: Location.lookup('Hawaii'),
  };
  const events = HebrewCalendar.calendar(options);
  options.prodid = 'X';
  const ical = await eventsToIcalendar(events, options);
  const lines = ical.split('\r\n').slice(0, 12);
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

test('subscribe-suppress-title-years', async (t) => {
  const options = {
    year: 2026,
    month: 2,
    sedrot: true,
    candlelighting: true,
    location: Location.lookup('Hawaii'),
  };
  const events = HebrewCalendar.calendar(options);
  options.prodid = 'X';
  options.subscribe = '1';
  const ical = await eventsToIcalendar(events, options);
  const lines = ical.split('\r\n');
  t.is(findLine(lines, 'X-WR-CALNAME'), 'Hebcal Hawaii');

  options.subscribe = false;
  const ical2 = await eventsToIcalendar(events, options);
  const lines2 = ical2.split('\r\n');
  t.is(findLine(lines2, 'X-WR-CALNAME'), 'Hebcal Hawaii February 2026');
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
  options.prodid = 'X';
  const ical = await eventsToIcalendar(events, options);
  const lines = ical.split('\r\n').slice(0, 11);
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
    'SUMMARY:Parashat Bamidbar / פָּרָשַׁת בְּמִדְבַּר',
    'SUMMARY:✨ Havdalah / הַבדָלָה',
    'SUMMARY:🌒 Rosh Chodesh Sivan / רֹאשׁ חוֹדֶשׁ סִיוָן',
    'SUMMARY:⛰️🌸 Erev Shavuot / עֶרֶב שָׁבוּעוֹת',
    'SUMMARY:🕯️ Candle lighting / הַדלָקָת נֵרוֹת',
    'SUMMARY:⛰️🌸 Shavuot I / שָׁבוּעוֹת א׳',
    'SUMMARY:🕯️ Candle lighting / הַדלָקָת נֵרוֹת',
    'SUMMARY:⛰️🌸 Shavuot II / שָׁבוּעוֹת ב׳',
    'SUMMARY:✨ Havdalah / הַבדָלָה',
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
    ' the Festival of Lights\\n\\nhttps://hebcal.com/h/chanukah-2020?us=js&um=ical',
    ' endar',
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
    'DESCRIPTION:Eighth Day of Assembly\\n\\nTorah: Deuteronomy 33:1-34:12\\; Gene',
    ' sis 1:1-2:3\\; Numbers 29:35-30:1\\nHaftarah: Joshua 1:1-18\\n\\nhttps://hebca',
    ' l.com/h/shmini-atzeret-2021?i=on&us=js&um=icalendar',
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
    'DESCRIPTION:Event reminder',
    'TRIGGER:-P0DT12H0M0S',
    'END:VALARM',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('relcalid', async (t) => {
  const event = new HebrewDateEvent(new HDate(new Date(2021, 1, 13)));
  const relcalid = '01enedk40bytfd4enm1673bdqh';
  const ical = await eventsToIcalendar([event], {relcalid, prodid: 'X'});
  const lines = ical.split('\r\n');
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
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'SUMMARY:37th day of the Omer ㊲',
    'DTSTART;VALUE=DATE:20210504',
    'DTEND;VALUE=DATE:20210505',
    'UID:hebcal-20210504-45f4acad',
    'UID:X',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Today is 37 days\\, which is 5 weeks and 2 days of the Omer\\n\\n',
    ' Might within Foundation\\nגְבוּרָה שֶׁבִּיְּסוֹד\\nGevu',
    ' rah shebiYesod\\n\\nhttps://www.hebcal.com/omer/5781/37',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder',
    'TRIGGER:-P0DT3H30M0S',
    'END:VALARM',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('omer-alarm', (t) => {
  const dt = new Date(2022, 3, 26);
  const options = {
    start: dt,
    end: dt,
    noHolidays: true,
    omer: true,
    candlelighting: true,
    location: Location.lookup('Vancouver'),
  };
  const ev = HebrewCalendar.calendar(options)[0];
  const ical = new IcalEvent(ev, options);
  const lines = ical.toString().split('\r\n');
  const alarm = lines.slice(lines.length - 6);
  const expected = [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder',
    'TRIGGER;VALUE=DATE-TIME:20220426T040300Z',
    'END:VALARM',
    'END:VEVENT',
  ];
  t.deepEqual(alarm, expected);
});

/** @private */
class TestEvent extends Event {
  /** @param {HDate} date */
  constructor(date) {
    super(date, 'Test Event', 0);
  }
  /** @return {string} */
  url() {
    return 'https://www.hebcal.com/foobar';
  }
}

test('utm_campaign', (t) => {
  const ev = new TestEvent(new HDate(22, 'Iyyar', 5781));
  const icalEvent = new IcalEvent(ev, {utmSource: 'baaz', utmCampaign: 'quux'});
  const lines = icalEvent.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:Test Event',
    'DTSTART;VALUE=DATE:20210504',
    'DTEND;VALUE=DATE:20210505',
    'UID:hebcal-20210504-9f01ca16',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:https://www.hebcal.com/foobar?utm_source=baaz&utm_medium=icale',
    ' ndar&utm_campaign=quux',
    'END:VEVENT',
  ];
  t.deepEqual(lines, expected);
});

test('campaign2', (t) => {
  const ev1 = new ParshaEvent(new HDate(new Date(2022, 3, 30)), ['Kedoshim'], true);
  const ical1 = new IcalEvent(ev1, {utmCampaign: 'ical-foo-bar'});
  const lines1 = ical1.getLongLines();
  const desc1 = findLine(lines1, 'DESCRIPTION');
  t.is(desc1, 'Torah: Leviticus 19:1-20:27\\nHaftarah: I Samuel 20:18-42 | Shabbat Machar Chodesh\\nHaftarah for Sephardim: Ezekiel 20:2-20\\n\\nhttps://hebcal.com/s/kedoshim-20220430?i=on&uc=ical-foo-bar');

  const ev2 = new DafYomiEvent(new HDate(new Date(1995, 11, 17)));
  const ical2 = new IcalEvent(ev2, {utmCampaign: 'ical-foo-bar'});
  const lines2 = ical2.getLongLines();
  const desc2 = findLine(lines2, 'DESCRIPTION');
  t.is(desc2, 'https://www.sefaria.org/Avodah_Zarah.68a?lang=bi&utm_source=hebcal.com&utm_medium=icalendar&utm_campaign=ical-foo-bar');
});

test('caldesc', async (t) => {
  const ev = new TestEvent(new HDate(22, 'Iyyar', 5781));
  const ical = await eventsToIcalendar([ev], {
    caldesc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
  });
  const lines = ical.split('\r\n').slice(8, 10);
  const expected = [
    'X-WR-CALDESC:Lorem ipsum dolor sit amet\\, consectetur adipiscing elit\\, se',
    ' d do eiusmod tempor incididunt ut labore et dolore magna aliqua',
  ];
  t.deepEqual(lines, expected);
  const all = ical.split('\r\n');
  for (let i = 0; i < all.length; i++) {
    t.is(all[i].length <= 75, true, `line ${i} is ${all[i].length}: ${all[i]}`);
  }

  const ical2 = await eventsToIcalendar([ev], {
    caldesc: 'לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית להאמית קרהשק סכעיט דז מא, מנכם למטכין נשואי מנורך. קולהע צופעט למרקוח איבן איף, ברומץ כלרשט מיחוצים.',
  });
  const lines2 = ical2.split('\r\n').slice(8, 12);
  const expected2 = [
    'X-WR-CALDESC:לורם איפסום דולור סיט אמט\\, קונסקט',
    ' ורר אדיפיסינג אלית להאמית קרהשק סכעיט דז',
    '  מא\\, מנכם למטכין נשואי מנורך. קולהע צופעט',
    '  למרקוח איבן איף\\, ברומץ כלרשט מיחוצים.',
  ];
  t.deepEqual(lines2, expected2);
  const all2 = ical2.split('\r\n');
  for (let i = 0; i < all2.length; i++) {
    t.is(all2[i].length <= 75, true, `line ${i} is ${all2[i].length}: ${all2[i]}`);
  }
});

test('uid', (t) => {
  const ical1 = new IcalEvent(new Event(new HDate(22, 'Iyyar', 5781), 'Foo Bar'), {});
  t.is(ical1.getUid(), 'hebcal-20210504-568cd823');
  const ical2 = new IcalEvent(new Event(new HDate(2, 'Cheshvan', 5782), 'Hello World'), {});
  t.is(ical2.getUid(), 'hebcal-20211008-197683ce');
});
