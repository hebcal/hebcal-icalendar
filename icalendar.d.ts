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
 * Generates an RFC 2445 iCalendar string from an array of IcalEvents
 * @returns multi-line result, delimited by \r\n
 */
 export async function icalEventsToString(icals: IcalEvent[], options: HebrewCalendar.Options): string;

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
  static escape(str: string): string;
  static formatYYYYMMDD(dt: Date): string;
  static makeDtstamp(dt: Date): string;
  static version(): string;
  static fold(line: string): string;
}
}
