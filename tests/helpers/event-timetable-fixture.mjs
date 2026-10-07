import { fixtureEvent } from './event-categories-fixture.mjs';
import { normalizeTimetable } from '../../scripts/filemaker/contracts-v2/timetable.mjs';

export const slot = (start='2026-10-16T22:00:00+02:00', end='2026-10-16T23:30:00+02:00', extra={}) => ({
  start, end, artists:[{name:'Timetable Artist',info:'Live',link:'https://example.com/artist?a=1&b=2'}], ...extra
});
export const timetable = (...slots) => normalizeTimetable({slots});
const event = (id, slots, extra={}) => fixtureEvent(id, ['2026-10-16'], {
  description:'Preserved description', ...extra, ...(slots ? {timetable:timetable(...slots)} : {})
});
export const timetableFixture = {events:[
  event('no-timetable', null),
  event('midnight', [slot(undefined,undefined,{floor:'Main'}),slot('2026-10-16T23:30:00+02:00','2026-10-17T01:00:00+02:00',{floor:'Main',artists:[{name:'Artist B'}]})]),
  event('days-floors', [slot(undefined,undefined,{floor:'Main'}),slot(undefined,undefined,{floor:'Floor 2'}),slot('2026-10-17T22:00:00+02:00','2026-10-17T23:00:00+02:00',{floor:'Main'}),slot('2026-10-17T22:00:00+02:00','2026-10-18T02:00:00+02:00',{floor:'Floor 2'})]),
  event('unnamed', [slot()]),
  event('multiple-artists', [slot(undefined,undefined,{floor:'Langer Floor '.repeat(15).trim(), artists:[{name:'Langer Artistname '.repeat(10).trim(),info:'Lange Information '.repeat(15).trim(),link:'https://example.com/artist'},{name:'Second Artist'}]})]),
  event('tags-timetable', [slot(),slot(undefined,undefined,{floor:'Main'})],{tags:['HOUSE','Live']}),
  fixtureEvent('multi-month-timetable',['2026-10-31','2026-11-01'],{timetable:timetable(slot('2026-11-01T23:00:00+01:00','2026-11-02T02:00:00+01:00'))})
]};
