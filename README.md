# hebcal-icalendar
Jewish holidays and Hebrew calendar as iCalendar RFC 2445

## Installation
```bash
$ npm install @hebcal/icalendar
```

## Synopsis
```javascript
import {HebrewCalendar, Location} from '@hebcal/core';
import {eventsToIcalendar} from '@hebcal/icalendar';

const options = {
  year: 2020,
  month: 2,
  sedrot: true,
  candlelighting: true,
  location: Location.lookup('Hawaii'),
};
const events = HebrewCalendar.calendar(options);
console.log(await eventsToIcalendar(ev, options));
```

## Functions

<dl>
<dt><a href="#eventToIcal">eventToIcal(e, options)</a> ⇒ <code>string</code></dt>
<dd><p>Transforms a single Event into a VEVENT string</p>
</dd>
<dt><a href="#eventsToIcalendarStream">eventsToIcalendarStream(readable, events, options)</a> ⇒ <code>stream.Readable</code></dt>
<dd><p>Generates an RFC 2445 iCalendar stream from an array of events</p>
</dd>
<dt><a href="#eventsToIcalendar">eventsToIcalendar(events, options)</a> ⇒ <code>string</code></dt>
<dd><p>Renders an array of events as a full RFC 2445 iCalendar string</p>
</dd>
</dl>

<a name="eventToIcal"></a>

## eventToIcal(e, options) ⇒ <code>string</code>
Transforms a single Event into a VEVENT string

**Kind**: global function  
**Returns**: <code>string</code> - multi-line result, delimited by \r\n  

| Param | Type |
| --- | --- |
| e | <code>Event</code> | 
| options | <code>HebcalOptions</code> | 

<a name="eventsToIcalendarStream"></a>

## eventsToIcalendarStream(readable, events, options) ⇒ <code>stream.Readable</code>
Generates an RFC 2445 iCalendar stream from an array of events

**Kind**: global function  

| Param | Type |
| --- | --- |
| readable | <code>stream.Readable</code> | 
| events | <code>Array.&lt;Event&gt;</code> | 
| options | <code>HebcalOptions</code> | 

<a name="eventsToIcalendar"></a>

## eventsToIcalendar(events, options) ⇒ <code>string</code>
Renders an array of events as a full RFC 2445 iCalendar string

**Kind**: global function  
**Returns**: <code>string</code> - multi-line result, delimited by \r\n  

| Param | Type |
| --- | --- |
| events | <code>Array.&lt;Event&gt;</code> | 
| options | <code>HebcalOptions</code> | 

