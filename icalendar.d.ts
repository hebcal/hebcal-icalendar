/// <reference types="node"/>
import {HebrewCalendar, Event} from '@hebcal/core';
import stream from 'stream';
declare module '@hebcal/icalendar' {
/**
 * @returns multi-line result, delimited by \r\n
 */
export function eventToIcal(e: Event, options: HebrewCalendar.Options): string;
/**
 * Renders an array of events as a full RFC 2445 iCalendar string
 * @returns multi-line result, delimited by \r\n
 */
export function eventsToIcalendar(events: Event[], options: HebrewCalendar.Options): string;
/**
 * Generates an RFC 2445 iCalendar stream from an array of events
 */
export function eventsToIcalendarStream(readable: stream.Readable, events: Event[], options: HebrewCalendar.Options): string;
}
