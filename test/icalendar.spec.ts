/* eslint-disable max-len */
import {expect, test} from 'vitest';
import {
  HebrewCalendar,
  Location,
  HDate,
  Event,
  flags,
  ParshaEvent,
  TimedEvent,
  CalOptions,
  HebrewDateEvent,
  OmerEvent,
} from '@hebcal/core';
import {DafYomiEvent} from '@hebcal/learning';
import {
  ICalOptions,
  IcalEvent,
  eventsToIcalendar,
  icalEventsToString,
} from '../src/icalendar';

/**
 * @private
 */
function findLine(lines: string[], propName: string): string | null {
  const line = lines.find(line => line.startsWith(propName));
  if (line) {
    return line.substring(line.indexOf(':') + 1);
  }
  return null;
}

test('ical-sedra', () => {
  const options: ICalOptions = {
    year: 1993,
    month: 4,
    sedrot: true,
    noHolidays: true,
  };
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
    ' HaGadol\\n\\nhttps://hebcal.com/s/5753/25?us=ical&um=icalendar',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);

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
    ' | Shabbat Rosh Chodesh\\n\\nhttps://hebcal.com/s/5753/38?us=ical&um=icalenda',
    ' r',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);
});

test('ical-transp-opaque', () => {
  const options: CalOptions = {
    year: 1993,
    month: 4,
    noMinorFast: true,
    noRoshChodesh: true,
    noSpecialShabbat: true,
  };
  const icalOpts: ICalOptions = {
    ...options,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const memo = 'Passover, the Feast of Unleavened Bread';
  events[0].memo = memo;
  let lines = new IcalEvent(events[0], icalOpts).toString().split('\r\n');
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
    ' /h/pesach-1993?us=ical&um=icalendar',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);

  lines = new IcalEvent(events[1], icalOpts).toString().split('\r\n');
  expect(findLine(lines, 'SUMMARY')).toBe('🫓🍷 Pesach I');
  expect(findLine(lines, 'TRANSP')).toBe('OPAQUE');

  events[2].memo = memo;
  lines = new IcalEvent(events[2], icalOpts).toString().split('\r\n');
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
    ' ps://hebcal.com/h/pesach-1993?us=ical&um=icalendar',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);

  lines = new IcalEvent(events[3], icalOpts).toString().split('\r\n');
  expect(findLine(lines, 'SUMMARY')).toBe('🫓 Pesach III (CH’’M)');
  expect(findLine(lines, 'TRANSP')).toBe('TRANSPARENT');
});

test('ical-candles', () => {
  const options: CalOptions = {
    start: new Date(1993, 2, 12),
    end: new Date(1993, 2, 14),
    location: new Location(
      41.85003,
      -87.65005,
      false,
      'America/Chicago',
      'Chicago',
      'US',
      4887398
    ),
    candlelighting: true,
    noHolidays: true,
  };
  const icalOpts: ICalOptions = {
    ...options,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const ical = new IcalEvent(events[0], icalOpts);
  let lines = ical.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:🕯️ Candle lighting',
    'DTSTART;TZID=America/Chicago:19930312T173700',
    'DTEND;TZID=America/Chicago:19930312T173700',
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
  expect(lines).toEqual(expected);

  const havdalah = new IcalEvent(events[1], icalOpts);
  lines = havdalah.toString().split('\r\n');
  expect(lines.length).toBe(13);
  expect(lines[0]).toBe('BEGIN:VEVENT');
  expect(findLine(lines, 'SUMMARY')).toBe('✨ Havdalah');
  expect(findLine(lines, 'LOCATION')).toBe('Chicago');
});

test('ical-dafyomi', () => {
  const options: ICalOptions = {
    year: 1993,
    month: 3,
    noHolidays: true,
    dailyLearning: {dafYomi: true},
    locale: 'he',
  };
  const ev = HebrewCalendar.calendar(options)[0];
  expect(ev.getDesc()).toBe('Nedarim 14');
  const ical = new IcalEvent(ev, options);
  const lines = ical.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Daf Yomi',
    'SUMMARY:נדרים דף י״ד',
    'DTSTART;VALUE=DATE:19930301',
    'DTEND;VALUE=DATE:19930302',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:https://www.sefaria.org/Nedarim.14a?lang=bi&utm_source=hebcal.',
    ' com&utm_medium=icalendar',
    'LOCATION:דַּף יוֹמִי',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);
});

test('eventsToIcalendar', async () => {
  const options: ICalOptions = {
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
  expect(lines).toEqual(expected);
});

test('subscribe-suppress-title-years', async () => {
  const options: ICalOptions = {
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
  expect(findLine(lines, 'X-WR-CALNAME')).toBe('Hebcal Hawaii');

  options.subscribe = false;
  const ical2 = await eventsToIcalendar(events, options);
  const lines2 = ical2.split('\r\n');
  expect(findLine(lines2, 'X-WR-CALNAME')).toBe('Hebcal Hawaii February 2026');
});

test('eventsToIcalendar-no-vtimezone', async () => {
  const options: ICalOptions = {
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
  expect(lines).toEqual(expected);
});

test('appendHebrewToSubject', () => {
  const options: CalOptions = {
    start: new Date(2020, 4, 23),
    end: new Date(2020, 4, 30),
    sedrot: true,
    candlelighting: true,
    location: Location.lookup('Gibraltar'),
  };
  const icalOpts: ICalOptions = {
    ...options,
    appendHebrewToSubject: true,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const icals = events.map(ev => new IcalEvent(ev, icalOpts));
  const summary = icals.map(i =>
    i
      .toString()
      .split('\r\n')
      .find(s => s.startsWith('SUMMARY'))
  );
  const expected = [
    'SUMMARY:Parashat Bamidbar / פָּרָשַׁת בְּמִדְבַּר',
    'SUMMARY:✨ Havdalah / הַבְדָּלָה',
    'SUMMARY:🌒 Rosh Chodesh Sivan / רֹאשׁ חוֹדֶשׁ סִיוָן',
    'SUMMARY:⛰️🌸 Erev Shavuot / עֶרֶב שָׁבוּעוֹת',
    'SUMMARY:🕯️ Candle lighting / הַדְלָקַת נֵרוֹת',
    'SUMMARY:⛰️🌸 Shavuot I / שָׁבוּעוֹת א׳',
    'SUMMARY:🕯️ Candle lighting / הַדְלָקַת נֵרוֹת',
    'SUMMARY:⛰️🌸 Shavuot II / שָׁבוּעוֹת ב׳',
    'SUMMARY:✨ Havdalah / הַבְדָּלָה',
  ];
  expect(summary).toEqual(expected);
});

test('chanukah-candles', () => {
  const options: CalOptions = {
    start: new Date(2020, 11, 11),
    end: new Date(2020, 11, 11),
    location: Location.lookup('Boston'),
    candlelighting: true,
  };
  const icalOpts: ICalOptions = {
    ...options,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const ical = new IcalEvent(events[0], icalOpts);
  const lines = ical.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Holiday',
    'SUMMARY:🕎2️⃣ Chanukah: 2 Candles',
    'DTSTART;TZID=America/New_York:20201211T155300',
    'DTEND;TZID=America/New_York:20201211T155300',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'CLASS:PUBLIC',
    'DESCRIPTION:Hanukkah\\, the Jewish festival of rededication. Also known as ',
    ' the Festival of Lights\\, the eight-day festival is observed by lighting th',
    ' e candles of a hanukkiah (menorah)\\n\\nhttps://hebcal.com/h/chanukah-2020?u',
    ' s=ical&um=icalendar',
    'LOCATION:Boston',
    'GEO:42.35843;-71.05977',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);
});

test('ical-il-url', () => {
  const options: CalOptions = {
    start: new Date(2021, 8, 28),
    end: new Date(2021, 8, 28),
    il: true,
  };
  const icalOpts: ICalOptions = {
    ...options,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const ical = new IcalEvent(events[0], icalOpts);
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
    'DESCRIPTION:Eighth Day of Assembly. Immediately following Sukkot\\, it is o',
    ' bserved as a separate holiday in the Diaspora and is combined with Simchat',
    '  Torah in Israel\\n\\nTorah: Deuteronomy 33:1-34:12\\; Genesis 1:1-2:3\\; Numb',
    ' ers 29:35-30:1\\nHaftarah: Joshua 1:1-18\\n\\nhttps://hebcal.com/h/shmini-atz',
    ' eret-2021?i=on&us=ical&um=icalendar',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);
});

test('userEvent', () => {
  const hd = new HDate(new Date(2021, 1, 13));
  const userEvent = new Event(hd, 'User Event', flags.USER_EVENT, {
    uid: 'foo-bar-baaz',
  });
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
  expect(lines).toEqual(expected);
});

test('relcalid', async () => {
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
  expect(lines).toEqual(expected);
});

test('fastStartEnd', () => {
  const options: CalOptions = {
    start: new Date(2021, 5, 27),
    end: new Date(2021, 5, 27),
    location: Location.lookup('Providence'),
    candlelighting: true,
  };
  const icalOpts: ICalOptions = {
    ...options,
    emoji: true,
  };
  const events = HebrewCalendar.calendar(options);
  const icals = events
    .map(ev => new IcalEvent(ev, icalOpts))
    .map(i => i.toString());
  const actual = icals.map(s =>
    s.split('\r\n').filter(s => {
      return (
        s.startsWith('SUMMARY') ||
        s.startsWith('DTSTART') ||
        s.startsWith('DESCRIPTION')
      );
    })
  );
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
  expect(actual).toEqual(expected);
});

test('publishedTTL', async () => {
  const event = new HebrewDateEvent(new HDate(new Date(2021, 1, 13)));
  const ical = await eventsToIcalendar([event], {publishedTTL: 'PT2D'});
  const lines = ical.split('\r\n');
  expect(lines[6]).toBe('X-PUBLISHED-TTL:PT2D');
  const ical2 = await eventsToIcalendar([event], {publishedTTL: false});
  expect(ical2.indexOf('X-PUBLISHED-TTL')).toBe(-1);
});

test('OmerEvent', () => {
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
    ' הַיּוֹם שִׁבְעָה וּשְׁלוֹשִׁים יוֹם\\, שֶ',
    ' ׁהֵם חֲמִשָּׁה שָׁבוּעוֹת וּשְׁנֵי יָמִ',
    ' ים לָעֽוֹמֶר\\n\\nMight within Foundation\\nגְּבוּרָה ש',
    ' ֶׁבִּיְסוֹד\\nGevurah shebiYesod',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder',
    'TRIGGER:-P0DT3H30M0S',
    'END:VALARM',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);
});

test('omer-alarm', () => {
  const dt = new Date(2022, 3, 26);
  const options: ICalOptions = {
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
  expect(alarm).toEqual(expected);
});

/** @private */
class TestEvent extends Event {
  constructor(date: HDate) {
    super(date, 'Test Event', 0);
  }
  url(): string {
    return 'https://www.hebcal.com/foobar';
  }
  getCategories(): string[] {
    return ['holiday'];
  }
}

test('utm_campaign', () => {
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
  expect(lines).toEqual(expected);
});

test('campaign2', () => {
  const ev1 = new ParshaEvent({
    hdate: new HDate(new Date(2022, 3, 30)),
    parsha: ['Kedoshim'],
    il: true,
    chag: false,
  });
  const ical1 = new IcalEvent(ev1, {utmCampaign: 'ical-foo-bar'});
  const lines1 = ical1.getLongLines();
  const desc1 = findLine(lines1, 'DESCRIPTION');
  expect(desc1).toBe(
    'Torah: Leviticus 19:1-20:27\\nHaftarah: I Samuel 20:18-42 | Shabbat Machar Chodesh\\n\\nhttps://hebcal.com/s/5782i/30?uc=ical-foo-bar'
  );

  const ev2 = new DafYomiEvent(new HDate(new Date(1995, 11, 17)));
  const ical2 = new IcalEvent(ev2, {utmCampaign: 'ical-foo-bar'});
  const lines2 = ical2.getLongLines();
  const desc2 = findLine(lines2, 'DESCRIPTION');
  expect(desc2).toBe(
    'https://www.sefaria.org/Avodah_Zarah.68a?lang=bi&utm_source=hebcal.com&utm_medium=icalendar&utm_campaign=ical-foo-bar'
  );
});

test('caldesc', async () => {
  const ev = new TestEvent(new HDate(22, 'Iyyar', 5781));
  const ical = await eventsToIcalendar([ev], {
    caldesc:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
  });
  const lines = ical.split('\r\n').slice(8, 10);
  const expected = [
    'X-WR-CALDESC:Lorem ipsum dolor sit amet\\, consectetur adipiscing elit\\, se',
    ' d do eiusmod tempor incididunt ut labore et dolore magna aliqua',
  ];
  expect(lines).toEqual(expected);
  const all = ical.split('\r\n');
  for (const element of all) {
    expect(element.length <= 75).toBe(true);
  }

  const ical2 = await eventsToIcalendar([ev], {
    caldesc:
      'לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית להאמית קרהשק סכעיט דז מא, מנכם למטכין נשואי מנורך. קולהע צופעט למרקוח איבן איף, ברומץ כלרשט מיחוצים.',
  });
  const lines2 = ical2.split('\r\n').slice(8, 12);
  const expected2 = [
    'X-WR-CALDESC:לורם איפסום דולור סיט אמט\\, קונסקט',
    ' ורר אדיפיסינג אלית להאמית קרהשק סכעיט דז',
    '  מא\\, מנכם למטכין נשואי מנורך. קולהע צופעט',
    '  למרקוח איבן איף\\, ברומץ כלרשט מיחוצים.',
  ];
  expect(lines2).toEqual(expected2);
  const all2 = ical2.split('\r\n');
  for (const element of all2) {
    expect(element.length <= 75).toBe(true);
  }
});

test('uid', () => {
  const ical1 = new IcalEvent(
    new Event(new HDate(22, 'Iyyar', 5781), 'Foo Bar'),
    {}
  );
  expect(ical1.getUid()).toBe('hebcal-20210504-568cd823');
  const ical2 = new IcalEvent(
    new Event(new HDate(2, 'Cheshvan', 5782), 'Hello World'),
    {}
  );
  expect(ical2.getUid()).toBe('hebcal-20211008-197683ce');

  const latitude = -23.5475;
  const longitude = -46.63611;
  const tzid = 'America/Sao_Paulo';
  const cityName = 'São Paulo, Brazil';
  const location = new Location(latitude, longitude, false, tzid, cityName);
  const timedEv = new TimedEvent(
    new HDate(3, 'Kislev', 5783),
    'Foo Bar',
    flags.LIGHT_CANDLES,
    new Date(),
    location
  );
  const ical3 = new IcalEvent(timedEv, {});
  expect(ical3.getUid()).toBe('hebcal-20221127-568cd823');

  const ical4 = new IcalEvent(timedEv, {location});
  expect(ical4.getUid()).toBe('hebcal-20221127-568cd823-s-o-paulo-brazil');

  const loc2 = new Location(
    latitude,
    longitude,
    false,
    tzid,
    cityName,
    undefined,
    12345
  );
  const ical5 = new IcalEvent(timedEv, {location: loc2});
  expect(ical5.getUid()).toBe('hebcal-20221127-568cd823-12345');
});

test('yerushalmi-yomi', () => {
  const hd = new HDate(new Date(2022, 10, 15));
  const options: ICalOptions = {
    start: hd,
    end: hd,
    noHolidays: true,
    dailyLearning: {yerushalmi: true},
    locale: 'ashkenazi',
  };
  const ev = HebrewCalendar.calendar(options)[0];
  expect(ev.getDesc()).toBe('Berakhot 2');
  const ical = new IcalEvent(ev, options);
  const lines = ical.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  lines[6] = 'UID:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Yerushalmi Yomi',
    'SUMMARY:Berakhos 2',
    'DTSTART;VALUE=DATE:20221115',
    'DTEND;VALUE=DATE:20221116',
    'UID:X',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'CLASS:PUBLIC',
    'DESCRIPTION:https://www.sefaria.org/Jerusalem_Talmud_Berakhot.1.1.7-11?lan',
    ' g=bi&utm_source=hebcal.com&utm_medium=icalendar',
    'LOCATION:Yerushalmi Yomi',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);
});

test('sequence', () => {
  const ev = new TestEvent(new HDate(22, 'Iyyar', 5781));
  const icalEvent = new IcalEvent(ev, {sequence: 73});
  const lines = icalEvent.toString().split('\r\n').slice(0, 5);
  lines[1] = 'DTSTAMP:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'SEQUENCE:73',
    'CATEGORIES:Holiday',
    'SUMMARY:Test Event',
  ];
  expect(lines).toEqual(expected);
});

test('linkedEvent-memo', () => {
  const hd = new HDate(22, 'Iyyar', 5781);
  const ev1 = new HebrewDateEvent(hd);
  const ev2 = new Event(hd, 'Foo Bar Baaz', flags.USER_EVENT, {
    linkedEvent: ev1,
  });
  const icalEvent = new IcalEvent(ev2, {});
  const lines = icalEvent.toString().split('\r\n');
  lines[1] = 'DTSTAMP:X';
  const expected = [
    'BEGIN:VEVENT',
    'DTSTAMP:X',
    'CATEGORIES:Personal',
    'SUMMARY:Foo Bar Baaz',
    'DTSTART;VALUE=DATE:20210504',
    'DTEND;VALUE=DATE:20210505',
    'UID:hebcal-20210504-0401511f',
    'TRANSP:TRANSPARENT',
    'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'DESCRIPTION:22nd of Iyyar\\, 5781',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder',
    'TRIGGER:-P0DT12H0M0S',
    'END:VALARM',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);
});

test('parsha-with-memo', () => {
  const ev = new ParshaEvent({
    hdate: new HDate(new Date(2023, 9, 21)),
    parsha: ['Noach'],
    il: false,
    chag: false,
  });
  ev.memo = 'Hello World!';
  const icalEvent = new IcalEvent(ev, {});
  const lines = icalEvent.getLongLines();
  const description = findLine(lines, 'DESCRIPTION');
  expect(description).toBe(
    'Hello World!\\n\\nTorah: Genesis 6:9-11:32\\nHaftarah: Isaiah 54:1-55:5\\nHaftarah for Sephardim: Isaiah 54:1-10\\n\\nhttps://hebcal.com/s/5784/2?us=ical&um=icalendar'
  );
});

test('parsha-apos', () => {
  const ev = new ParshaEvent({
    hdate: new HDate(8, 'Tishrei', 5784),
    parsha: ["Ha'azinu"],
    il: false,
    chag: false,
  });
  const icalEvent = new IcalEvent(ev, {locale: 'en'});
  const lines = icalEvent.getLongLines();
  expect(findLine(lines, 'SUMMARY')).toBe('Parashat Ha’azinu');
});

test('empty-events', async () => {
  expect.assertions(1);
  try {
    return await icalEventsToString([], {});
  } catch (error) {
    return expect((error as RangeError).message).toMatch(
      'Events can not be empty'
    );
  }
});

test('url', async () => {
  const ev = new TestEvent(new HDate(22, 'Iyyar', 5781));
  const icalEvent = new IcalEvent(ev, {url: true, dtstamp: 'X'});
  const lines = icalEvent.getLongLines();
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
    'DESCRIPTION:https://www.hebcal.com/foobar?utm_source=ical&utm_medium=icalendar',
    'URL:https://www.hebcal.com/foobar?utm_source=ical&utm_medium=icalendar',
    'END:VEVENT',
  ];
  expect(lines).toEqual(expected);
});
