// A real reminder without a server: an .ics file with a repeating event at the training time,
// on the training days of the current schedule, until the end of week 8. Calendar does the alerting.
import { dateKey, addDays, dayIndex, slotDate, sessionKeyFor, isRequired, mondayOf, buildSession, WEEKS } from './plan.js';
import { toast, timeLabel } from './ui.js';

const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const ical = (k) => k.replace(/-/g, '');

export function calendarICS(s, today = dateKey()) {
  const days = BYDAY.filter((_, i) => isRequired(sessionKeyFor(s, i)));
  const [h, m] = s.trainAt.split(':');
  let first = today < mondayOf(s.start) ? mondayOf(s.start) : today;
  for (let i = 0; i < 7 && !isRequired(sessionKeyFor(s, dayIndex(first))); i++) first = addDays(first, 1);
  const until = slotDate(s.start, 8, 6);
  // One event repeats, so it's as long as the longest training day, rounded up to 5 minutes.
  let longest = 0;
  for (let w = 1; w <= WEEKS; w++) for (let d = 0; d < 7; d++) if (isRequired(sessionKeyFor(s, d))) longest = Math.max(longest, buildSession(s, w, d).seconds);
  const mins = Math.max(20, Math.ceil(longest / 300) * 5);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Barracks PT//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:barracks-pt-${ical(s.start)}-${h}${m}@barracks-pt`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${ical(first)}T${h}${m}00`,
    `DURATION:PT${mins}M`,
    `RRULE:FREQ=WEEKLY;BYDAY=${days.join(',')};UNTIL=${ical(until)}T235959`,
    'SUMMARY:Barracks PT',
    'DESCRIPTION:Train now\\, then lunch. Make it protein-heavy.',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Barracks PT', 'TRIGGER:PT0S', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return { text: lines.join('\r\n') + '\r\n', days, first, until };
}

export function downloadCalendar(s) {
  if (!s.start) { toast('Set a start date first'); return; }
  const { text, days } = calendarICS(s);
  const blob = new Blob([text], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'barracks-pt.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  toast(`${days.length} days a week at ${timeLabel(s.trainAt)}: open the file to add it`);
}
