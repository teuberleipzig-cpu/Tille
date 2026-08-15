import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildResidentNewsPreview,
  detectCsvDelimiter,
  isResidentNewsImportSessionCurrent,
  mergeResidentNews,
  normalizeResidentNewsDate,
  parseResidentNewsCsv,
  patchResidentNews,
  residentNewsKey,
  suggestResidentNewsMapping
} from '../public/admin/js/features/residents/residents-news-csv-model.js';
import { saveResidentNewsImport } from '../public/admin/js/features/residents/residents-news-csv-save.js';

const parse = text => parseResidentNewsCsv(text);
const preview = (text, mapping = { date: 0, text: 1 }, existing = []) => buildResidentNewsPreview(parse(text), mapping, existing);

test('UTF-8 CSV preserves umlauts', () => assert.equal(parse('Datum;Text\n1.8.2026;Grüße aus Leipzig').rows[0].fields[1], 'Grüße aus Leipzig'));
test('UTF-8 BOM is removed', () => assert.equal(parse('\uFEFFDatum;Text\n1.8.2026;Hallo').headers[0], 'Datum'));
test('comma delimiter is detected', () => assert.equal(detectCsvDelimiter('date,text\n2026-01-01,x'), ','));
test('semicolon delimiter is detected', () => assert.equal(detectCsvDelimiter('date;text\n2026-01-01;x'), ';'));
test('tab delimiter is detected', () => assert.equal(detectCsvDelimiter('date\ttext\n2026-01-01\tx'), '\t'));
test('quoted comma stays in field', () => assert.equal(parse('date,text\n2026-01-01,"Hallo, Welt"').rows[0].fields[1], 'Hallo, Welt'));
test('quoted semicolon stays in field', () => assert.equal(parse('date;text\n2026-01-01;"Hallo; Welt"').rows[0].fields[1], 'Hallo; Welt'));
test('escaped quotes are decoded', () => assert.equal(parse('date,text\n2026-01-01,"Hallo ""Tille"""').rows[0].fields[1], 'Hallo "Tille"'));
test('CRLF rows parse', () => assert.equal(parse('date;text\r\n2026-01-01;x\r\n').rows.length, 1));
test('LF rows parse', () => assert.equal(parse('date;text\n2026-01-01;x\n').rows.length, 1));
test('empty rows are ignored', () => assert.equal(parse('date;text\n\n2026-01-01;x\n  ;  \n').rows.length, 1));
test('quoted multiline fields parse', () => assert.equal(parse('date,text\n2026-01-01,"erste\nzweite"').rows[0].fields[1], 'erste\nzweite'));
test('unclosed quote fails', () => assert.throws(() => parse('date,text\n2026-01-01,"x'), /Nicht geschlossen/));
test('missing header fails', () => assert.throws(() => parse(''), /Headerzeile/));

test('Date header is suggested', () => assert.equal(suggestResidentNewsMapping(['Date', 'Value']).date, 0));
test('Datum header is suggested', () => assert.equal(suggestResidentNewsMapping(['Datum', 'Value']).date, 0));
test('News header is suggested', () => assert.equal(suggestResidentNewsMapping(['Datum', 'News']).text, 1));
test('Description header is suggested', () => assert.equal(suggestResidentNewsMapping(['day', 'description']).text, 1));
test('manual mapping is honored', () => assert.equal(preview('text;date\nHallo;2026-01-01', { date: 1, text: 0 })[0].text, 'Hallo'));
test('missing date mapping fails', () => assert.throws(() => preview('date;text\n2026-01-01;x', { date: -1, text: 1 }), /Datum und Text/));
test('missing text mapping fails', () => assert.throws(() => preview('date;text\n2026-01-01;x', { date: 0, text: -1 }), /Datum und Text/));

test('ISO date normalizes', () => assert.equal(normalizeResidentNewsDate('2026-08-01'), '2026-08-01'));
test('short German date normalizes', () => assert.equal(normalizeResidentNewsDate('1.8.2026'), '2026-08-01'));
test('padded German date normalizes', () => assert.equal(normalizeResidentNewsDate('01.08.2026'), '2026-08-01'));
test('invalid date format is rejected', () => assert.equal(normalizeResidentNewsDate('August 1'), ''));
test('impossible German date is rejected', () => assert.equal(normalizeResidentNewsDate('31.02.2026'), ''));
test('impossible ISO date is rejected', () => assert.equal(normalizeResidentNewsDate('2026-02-30'), ''));
test('invalid month is rejected', () => assert.equal(normalizeResidentNewsDate('2026-13-01'), ''));

test('empty text is invalid', () => assert.equal(preview('date;text\n2026-01-01;')[0].status, 'invalid'));
test('whitespace text is invalid', () => assert.equal(preview('date;text\n2026-01-01;   ')[0].status, 'invalid'));
test('special characters survive', () => assert.equal(preview('date;text\n2026-01-01;A & B – 50%!')[0].text, 'A & B – 50%!'));
test('umlauts survive', () => assert.equal(preview('date;text\n2026-01-01;Äöü ß')[0].text, 'Äöü ß'));
test('long text survives', () => { const value = 'x'.repeat(4000); assert.equal(preview(`date;text\n2026-01-01;${value}`)[0].text.length, 4000); });

test('CSV internal duplicate is marked', () => assert.equal(preview('date;text\n2026-01-01;x\n2026-01-01;x')[1].status, 'csv-duplicate'));
test('existing duplicate is marked', () => assert.equal(preview('date;text\n2026-01-01;x', undefined, [{ date: '2026-01-01', text: 'x' }])[0].status, 'existing-duplicate'));
test('same text on another date is not duplicate', () => assert.equal(preview('date;text\n2026-01-02;x', undefined, [{ date: '2026-01-01', text: 'x' }])[0].status, 'valid'));
test('same date with another text is not duplicate', () => assert.equal(preview('date;text\n2026-01-01;y', undefined, [{ date: '2026-01-01', text: 'x' }])[0].status, 'valid'));
test('duplicates default to excluded', () => assert.equal(preview('date;text\n2026-01-01;x\n2026-01-01;x')[1].included, false));
test('duplicate key trims text', () => assert.equal(residentNewsKey({ date: '2026-01-01', text: ' x ' }), '2026-01-01\0x'));

test('merge preserves existing news', () => { const old = [{ date: '2025-01-01', text: 'old' }]; assert.deepEqual(mergeResidentNews(old, []), old); });
test('merge adds selected valid news', () => assert.equal(mergeResidentNews([], preview('date;text\n2026-01-01;new')).length, 1));
test('merge sorts date descending', () => assert.deepEqual(mergeResidentNews([{ date: '2025-01-01', text: 'old' }], preview('date;text\n2026-01-01;new')).map(x => x.date), ['2026-01-01', '2025-01-01']));
test('merge preserves unknown existing news fields', () => assert.equal(mergeResidentNews([{ date: '2025-01-01', text: 'old', future: 7 }], [])[0].future, 7));
test('fresh GitHub duplicate is skipped', () => assert.equal(mergeResidentNews([{ date: '2026-01-01', text: 'new' }], validRows()).length, 1));
test('merge does not mutate existing list', () => { const old = [{ date: '2025-01-01', text: 'old' }]; mergeResidentNews(old, preview('date;text\n2026-01-01;new')); assert.deepEqual(old, [{ date: '2025-01-01', text: 'old' }]); });

const documentFixture = () => ({ version: 4, residents: [{ id: 'a', name: 'A', portal: { invite: 'x' }, future: 9, news: 'legacy', newsItems: [] }, { id: 'b', name: 'B', newsItems: [{ date: '2025-01-01', text: 'old' }] }] });
test('patch changes only target resident', () => { const old = documentFixture(), next = patchResidentNews(old, 'b', [{ date: '2026-01-01', text: 'new' }]); assert.deepEqual(next.residents[0], old.residents[0]); });
test('other residents remain deep equal', () => { const old = documentFixture(), next = patchResidentNews(old, 'a', []); assert.deepEqual(next.residents[1], old.residents[1]); });
test('resident order stays identical', () => assert.deepEqual(patchResidentNews(documentFixture(), 'a', []).residents.map(x => x.id), ['a', 'b']));
test('target id remains identical', () => assert.equal(patchResidentNews(documentFixture(), 'a', []).residents[0].id, 'a'));
test('target portal remains identical', () => assert.deepEqual(patchResidentNews(documentFixture(), 'a', []).residents[0].portal, { invite: 'x' }));
test('unknown target fields remain identical', () => assert.equal(patchResidentNews(documentFixture(), 'a', []).residents[0].future, 9));
test('legacy news remains identical', () => assert.equal(patchResidentNews(documentFixture(), 'a', []).residents[0].news, 'legacy'));
test('top-level fields remain identical', () => assert.equal(patchResidentNews(documentFixture(), 'a', []).version, 4));
test('patch does not mutate input', () => { const old = documentFixture(); patchResidentNews(old, 'a', [{ date: '2026-01-01', text: 'x' }]); assert.deepEqual(old, documentFixture()); });
test('missing target aborts', () => assert.throws(() => patchResidentNews(documentFixture(), 'x', []), /nicht gefunden/));
test('duplicate target aborts', () => { const d = documentFixture(); d.residents.push({ id: 'a' }); assert.throws(() => patchResidentNews(d, 'a', []), /mehrfach/); });
test('empty residents aborts', () => assert.throws(() => patchResidentNews({ residents: [] }, 'a', []), /leer/));
test('invalid document aborts', () => assert.throws(() => patchResidentNews(null, 'a', []), /ungültig/));

function clientMock({ status = 200, invalid = false, document = documentFixture() } = {}) {
  const calls = [];
  return { calls, getTextFile: async path => { calls.push(['get', path]); return { text: invalid ? '{' : JSON.stringify(document), sha: 'fresh-sha' }; }, putTextFile: async (path, text, sha) => { calls.push(['put', path, text, sha]); if (status !== 200) { const error = new Error('conflict'); error.status = status; throw error; } return { content: { sha: 'new-sha' } }; } };
}
const validRows = () => preview('date;text\n2026-01-01;new');
const freshDuplicateDocument = () => ({ version: 4, residents: [{ id: 'a', newsItems: [{ date: '2026-01-01', text: 'new', future: 7 }] }] });
test('fresh SHA is used', async () => { const client = clientMock(); await saveResidentNewsImport({ client, path: 'residents.json', residentId: 'a', previewRows: validRows(), confirmed: true }); assert.equal(client.calls[1][3], 'fresh-sha'); });
test('fresh duplicate only -> no PUT', async () => { const client = clientMock({ document: freshDuplicateDocument() }); await assert.rejects(() => saveResidentNewsImport({ client, path: 'x', residentId: 'a', previewRows: validRows(), confirmed: true }), /Keine importierbaren News vorhanden/); assert.equal(client.calls.filter(x => x[0] === 'put').length, 0); });
test('mixed fresh duplicate + new row -> only new row saved', async () => { const client = clientMock({ document: freshDuplicateDocument() }); const rows = preview('date;text\n2026-01-01;new\n2026-02-01;another'); const result = await saveResidentNewsImport({ client, path: 'x', residentId: 'a', previewRows: rows, confirmed: true }); const saved = JSON.parse(client.calls.find(x => x[0] === 'put')[2]); assert.deepEqual(saved.residents[0].newsItems.map(item => item.text), ['another', 'new']); assert.equal(result.imported, 1); });
test('imported count reflects actual fresh-state additions', async () => { const client = clientMock({ document: freshDuplicateDocument() }); const rows = preview('date;text\n2026-01-01;new\n2026-02-01;another'); const result = await saveResidentNewsImport({ client, path: 'x', residentId: 'a', previewRows: rows, confirmed: true }); assert.equal(result.imported, 1); });
test('existing unknown news fields remain preserved after fresh dedupe', async () => { const client = clientMock({ document: freshDuplicateDocument() }); const rows = preview('date;text\n2026-01-01;new\n2026-02-01;another'); const result = await saveResidentNewsImport({ client, path: 'x', residentId: 'a', previewRows: rows, confirmed: true }); assert.equal(result.document.residents[0].newsItems.find(item => item.text === 'new').future, 7); });
test('conflict aborts save', async () => { const client = clientMock({ status: 409 }); await assert.rejects(() => saveResidentNewsImport({ client, path: 'x', residentId: 'a', previewRows: validRows(), confirmed: true }), /verändert/); });
test('conflict is not retried', async () => { const client = clientMock({ status: 409 }); await assert.rejects(() => saveResidentNewsImport({ client, path: 'x', residentId: 'a', previewRows: validRows(), confirmed: true })); assert.equal(client.calls.filter(x => x[0] === 'put').length, 1); });
test('GitHub failure returns no allegedly saved document', async () => { const client = clientMock({ status: 500 }); await assert.rejects(() => saveResidentNewsImport({ client, path: 'x', residentId: 'a', previewRows: validRows(), confirmed: true }), /GitHub-Speichern/); });
test('successful write returns updated state data', async () => { const result = await saveResidentNewsImport({ client: clientMock(), path: 'x', residentId: 'a', previewRows: validRows(), confirmed: true }); assert.equal(result.document.residents[0].newsItems[0].text, 'new'); assert.equal(result.sha, 'new-sha'); });
test('unconfirmed import performs no write', async () => { const client = clientMock(); await assert.rejects(() => saveResidentNewsImport({ client, path: 'x', residentId: 'a', previewRows: validRows(), confirmed: false }), /bestätigt/); assert.equal(client.calls.length, 0); });
test('cancel path performs no write', () => { const client = clientMock(); assert.equal(client.calls.length, 0); });
test('resident switch invalidates preview session', () => assert.equal(isResidentNewsImportSessionCurrent({ residentId: 'a' }, 'b'), false));
test('same resident keeps preview session valid', () => assert.equal(isResidentNewsImportSessionCurrent({ residentId: 'a' }, 'a'), true));
test('invalid fresh JSON aborts before PUT', async () => { const client = clientMock({ invalid: true }); await assert.rejects(() => saveResidentNewsImport({ client, path: 'x', residentId: 'a', previewRows: validRows(), confirmed: true }), /ungültig/); assert.equal(client.calls.filter(x => x[0] === 'put').length, 0); });
