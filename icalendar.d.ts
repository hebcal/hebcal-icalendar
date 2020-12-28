/// <reference types="node"/>
import {HebrewCalendar, Event} from '@hebcal/core';
declare module '@hebcal/icalendar' {
/**
 * @returns multi-line result, delimited by \r\n
 */
export function eventToIcal(e: Event, options: HebrewCalendar.Options): string;
/**
 * Renders an array of events as a full RFC 2445 iCalendar string
 * @returns multi-line result, delimited by \r\n
 */
export async function eventsToIcalendar(events: Event[], options: HebrewCalendar.Options): string;

/**
 * Represents an RFC 2445 iCalendar VEVENT
 */
export class IcalEvent {
  /**
   * Builds an IcalEvent object from a Hebcal Event
   */
  constructor(ev: Event, options: HebrewCalendar.Options);
  toString(): string;
  getLines(): string[];
  getLongLines(): string[];
}
}
