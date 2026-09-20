import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { patchResidentDocument } from '../public/admin/js/core/resident-fresh-patch.js';

const document = () => ({ unknownDocument: 1, residents: [{ id: 'fixture', bio: 'old', city: 'old', links: { soundcloud: 'old' }, photoList: [{ url: 'public/residents/media/fixture/photos/a.jpg', credit: 'credit' }], portal: { enabled: true, inviteId: 'fixture-invite', code: 'fixture-code', unknownAccess: { preserved: true } }, unknownResident: { preserve: true } }, { id: 'other', city: 'untouched' }] });
for (const field of ['bio', 'city', 'links', 'photoList']) {
  test(`fresh ${field} patch preserves updated access and unknown fields`, () => {
    const baseline = document(), draft = structuredClone(baseline), fresh = document();
    draft.residents[0][field] = field === 'links' ? { soundcloud: 'new' } : field === 'photoList' ? [{ ...baseline.residents[0].photoList[0], credit: 'new' }] : 'new';
    fresh.residents[0].portal.unknownAccess.newFlag = true; fresh.residents[0].portal.enabled = false;
    fresh.residents[0].unknownFuture = { nested: 1 }; fresh.residents[1].city = 'fresh';
    const next = patchResidentDocument({ baseline, draft, fresh });
    assert.deepEqual(next.residents[0].portal, fresh.residents[0].portal);
    assert.deepEqual(next.residents[0].unknownFuture, fresh.residents[0].unknownFuture);
    assert.deepEqual(next.residents[1], fresh.residents[1]);
    assert.deepEqual(next.residents[0][field], draft.residents[0][field]);
    assert.equal(next.unknownDocument, 1);
  });
}
test('attempted access edits/deletion are ignored, fresh access wins', () => {
  const baseline = document(), draft = document(), fresh = document();
  delete draft.residents[0].portal; draft.residents[0].inviteId = 'not-allowed'; draft.residents[0].bio = 'new';
  const next = patchResidentDocument({ baseline, draft, fresh });
  assert.deepEqual(next.residents[0].portal, fresh.residents[0].portal); assert.equal(next.residents[0].inviteId, undefined);
});
test('normalizers do not overwrite unedited raw fields', () => {
  const rawBaseline = document(), baseline = document(), fresh = document();
  baseline.residents[0].photoList = [{ url: baseline.residents[0].photoList[0].url }];
  const draft = structuredClone(baseline); draft.residents[0].bio = 'new';
  assert.deepEqual(patchResidentDocument({ baseline, rawBaseline, draft, fresh }).residents[0].photoList, fresh.residents[0].photoList);
  draft.residents[0].photoList.push({ url: 'public/residents/media/fixture/photos/b.jpg' });
  assert.throws(() => patchResidentDocument({ baseline, rawBaseline, draft, fresh }), /Unbekannte Felder/);
});
test('conflicting fresh field is rejected rather than retried/overwritten', () => {
  const baseline = document(), draft = document(), fresh = document(); draft.residents[0].bio = 'local'; fresh.residents[0].bio = 'remote';
  assert.throws(() => patchResidentDocument({ baseline, draft, fresh }), /inzwischen/);
});
test('editing a render-time default patches an originally absent field', () => {
  const rawBaseline = document(), fresh = document();
  const baseline = document(); baseline.residents[0].optional = '';
  const draft = structuredClone(baseline); draft.residents[0].optional = 'new';
  assert.equal(patchResidentDocument({ rawBaseline, baseline, draft, fresh }).residents[0].optional, 'new');
});
test('empty resident list and data/blob URLs are rejected', () => {
  assert.throws(() => patchResidentDocument({ baseline: document(), draft: { residents: [] }, fresh: document() }), /leer/);
  for (const url of ['data:image/jpeg;base64,AA==', 'blob:fixture', '\t data:image/jpeg;base64,AA==']) {
    const draft = document(); draft.residents[0].photoList[0].url = url;
    assert.throws(() => patchResidentDocument({ baseline: document(), draft, fresh: document() }), /Data-/);
  }
});
test('explicit create/delete/reorder semantics retain concurrent additions and unknowns', () => {
  const baseline = document(), draft = document(), fresh = document(); fresh.residents.push({ id: 'remote-new', unknown: 1 });
  draft.residents.push({ id: 'local-new', bio: 'new' });
  assert.deepEqual(patchResidentDocument({ baseline, draft, fresh }).residents.map(r => r.id), ['fixture', 'other', 'remote-new', 'local-new']);
  draft.residents.splice(1, 1); assert.throws(() => patchResidentDocument({ baseline, draft, fresh }), /Verlust/);
  assert.equal(patchResidentDocument({ baseline, draft, fresh, allowLoss: true }).residents.some(r => r.id === 'other'), false);
  const reordered = document(); reordered.residents.reverse();
  assert.equal(patchResidentDocument({ baseline, draft: reordered, fresh: document() }).residents[0].id, 'other');
  assert.throws(() => patchResidentDocument({ baseline, draft: reordered, fresh }), /Reihenfolge/);
});

test('active Access gate is idempotent, visible, disabled, read-only and cannot save/copy links', async () => {
  const elements = new Map();
  class Element {
    children = []; textContent = ''; disabled = false;
    set id(value) { this.name = value; elements.set(value, this); } get id() { return this.name; }
    append(value) { this.children.push(value); }
    setAttribute(name, value) { this[name] = value; }
    click() { if (!this.disabled) this.onclick?.(); }
  }
  const panel = new Element(); panel.id = 'resident-tab-profile';
  const resident = document().residents[0], original = structuredClone(resident); let saves = 0, writes = 0, copies = 0;
  const context = { document: { readyState: 'complete', getElementById: id => elements.get(id), createElement: () => new Element() }, currentResident: () => resident,
    autoSaveResidents: () => saves++, fetch: () => writes++, navigator: { clipboard: { writeText: () => copies++ } }, renderResidentForm() {} };
  context.window = context;
  vm.runInNewContext(await readFile(new URL('../public/admin/extensions/resident-access.js', import.meta.url), 'utf8'), context);
  context.renderResidentForm(); context.renderResidentForm();
  assert.equal(panel.children.length, 1);
  assert.match(elements.get('residentAccessReadOnly').textContent, /aktiv.*Invite vorhanden: ja.*Code vorhanden: ja/);
  const block = elements.get('residentAccessBlock'); assert.match(block.children[0].textContent, /vorübergehend deaktiviert/);
  for (const id of ['residentPortalEnabled', 'createResidentPortalAccess', 'regenResidentPortalCode', 'regenResidentPortalInvite', 'copyResidentPortalLink', 'copyResidentPortalCode']) {
    assert.equal(elements.get(id).disabled, true); elements.get(id).click();
  }
  assert.deepEqual(resident, original); assert.equal(saves + writes + copies, 0);
  assert.ok(block.children.every(c => !c.textContent.includes('branch=') && !c.textContent.includes('fixture-code')));
  const loader = await readFile(new URL('../public/admin/js/events-meta.js', import.meta.url), 'utf8');
  assert.match(loader, /resident-access\.js\?v=admin-staging-1/);
});
