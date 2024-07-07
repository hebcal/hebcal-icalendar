# @hebcal/icalendar
Jewish holidays and Hebrew calendar as iCalendar RFC 2445

## Installation
```bash
$ npm install @hebcal/icalendar
```

## Synopsis
```javascript
import {HebrewCalendar, Location} from '@hebcal/core';
import {eventsToIcalendar} from '@hebcal/icalendar';
import fs from 'fs';

const options = {
  year: 2020,
  month: 2,
  sedrot: true,
  candlelighting: true,
  location: Location.lookup('Tel Aviv'),
};
const events = HebrewCalendar.calendar(options);

const str = await eventsToIcalendar(events, {
  locale: 'he',
  ...options,
})

const icalStream = fs.createWriteStream('feed.ics');
icalStream.write(str);
icalStream.close();
```

## [API Documentation](https://hebcal.github.io/api/icalendar/index.html)
