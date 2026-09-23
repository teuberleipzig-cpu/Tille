import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createStagingOperation } from '../public/admin/js/core/staging-operation.js';
import { patchResidentDocument } from '../public/admin/js/core/resident-fresh-patch.js';
import { config, githubMock, CONTENT, NEXT_CODE } from './helpers/admin-staging-github.mjs';

const read = path => readFile(new URL('../public/admin/' + path, import.meta.url), 'utf8');
test('changed active entry points and secondary loaders carry staging cache versions', async () => {
  const html = await read('index.html'), meta = await read('js/events-meta.js'), fixes = await read('js/admin-v2-current-fixes.js');
  for (const name of ['staging-admin', 'admin-app', 'github-media', 'admin-v2-current-fixes']) assert.ok(html.includes(name + '.js?v=admin-staging-1'));
  for (const name of ['events-meta', 'auto-github-load']) assert.ok(html.includes(name + '.js?v=admin-weekday-categories-1'));
  for (const name of ['site-navigation', 'gallery']) assert.ok(html.includes(name + '.js?v=admin-staging-1'));
  for (const name of ['residents-media', 'residents-news', 'resident-access']) assert.ok(meta.includes(name + '.js?v=admin-staging-1'));
  for (const name of ['admin-draft-guard', 'admin-save-preflight', 'admin-write-baseline']) assert.ok(fixes.includes(name + '.js?v=admin-staging-1'));
});
async function bridge(mock) {
  const elements = new Map(Object.entries({ adminEnvironment: 'staging', ghBranch: 'content/staging', ghOwner: 'teuberleipzig-cpu', ghRepo: 'Tille', ghToken: 'fixture-token', adminStagingStatus: '' }).map(([id, value]) => [id, { value, disabled: false, addEventListener(name, fn) { this[name] = fn; } }]));
  const events = [];
  const sandbox = { document: { getElementById: id => elements.get(id), dispatchEvent: event => events.push(event.type) }, Event,
    __operation: { createStagingOperation: (input, options) => createStagingOperation(input, { ...options, fetch: mock.fetch }) } };
  sandbox.window = sandbox;
  const source = (await read('js/staging-admin.js')).replace("import('./core/staging-operation.js?v=admin-staging-1')", 'Promise.resolve(__operation)');
  vm.runInNewContext(source, sandbox);
  return { api: sandbox.AdminStaging, elements, events };
}
test('DOM field changes cannot redirect a bound writer; environment control is locked', async () => {
  const mock = githubMock(), { api, elements } = await bridge(mock), client = api.client('resident');
  const binding = client.bind(); assert.equal(elements.get('adminEnvironment').disabled, true);
  elements.get('ghBranch').value = 'main'; elements.get('ghToken').value = 'other';
  await binding; assert.equal(elements.get('adminEnvironment').disabled, false);
  await client.commitFiles({ files: new Map([['public/residents/data/residents.json', '{}']]), expectedHead: CONTENT });
  assert.equal(mock.calls.filter(c => c.method === 'PATCH')[0].path, '/git/refs/heads/content%2Fstaging');
  assert.ok(mock.calls.every(c => c.authorization === 'Bearer fixture-token'));
  await assert.rejects(api.client('resident').bind(), /content\/staging/);
});
test('pending media parent is mandatory for later JSON save and clears only on source reset', async () => {
  const mock = githubMock(), { api, elements, events } = await bridge(mock);
  await api.client('resident-media', 'fixture').putBase64File('public/residents/media/fixture/photos/a.jpg', 'Zml4dHVyZQ==', '');
  mock.content = NEXT_CODE;
  await assert.rejects(api.client('resident').requireMediaParent(), /bereits gespeichert/);
  assert.match(elements.get('adminStagingStatus').textContent, /teilweise bereits gespeichert/);
  elements.get('adminEnvironment').value = ''; elements.get('adminEnvironment').change();
  assert.deepEqual(events, ['admin-staging-source-change']);
  await assert.rejects(api.client('resident').bind(), /Staging/);
});
test('draft keys are explicit staging/source namespaced, missing and live fail', async () => {
  const { api, elements } = await bridge(githubMock());
  assert.equal(api.draftKey('residents'), 'distillery-admin-v2-staging-content-staging-residents-draft');
  for (const value of ['', 'live']) { elements.get('adminEnvironment').value = value; assert.throws(() => api.draftKey('residents'), /Staging/); }
});
test('global legacy entry points delegate to staging adapters or visibly fail closed', async () => {
  const statuses = [], sandbox = { setStatus: (...args) => statuses.push(args) }; sandbox.window = sandbox;
  vm.runInNewContext(await read('github-sync.js'), sandbox);
  await sandbox.saveResidentsToGithub(); assert.ok(statuses.length);
  let calls = 0; sandbox.AdminStagingActions = { saveResidents: () => calls++ };
  await sandbox.saveResidentsToGithub(); assert.equal(calls, 1);
});
test('draft button without environment shows an error and does not write local storage', async () => {
  const statuses = [], button = {}; let writes = 0;
  const sandbox = { document: { getElementById: () => button }, localStorage: { setItem: () => writes++ },
    AdminStaging: { draftKey() { throw new Error('Bitte Staging auswählen.'); } }, setStatus: (...args) => statuses.push(args) };
  sandbox.window = sandbox;
  vm.runInNewContext(await read('js/admin-draft-guard.js'), sandbox);
  button.onclick(); assert.equal(writes, 0); assert.match(statuses[0][1], /Staging/);
});
test('active resident load/save adapter patches only intent and reports dispatch failure separately', async () => {
  const path = 'public/residents/data/residents.json';
  const raw = { residents: [{ id: 'fixture', bio: 'old', portal: { inviteId: 'fixture-invite', unknown: true }, unknown: 42 }] };
  const mock = githubMock({ [path]: JSON.stringify(raw) }); mock.dispatchFailure = true;
  const elements = new Map(['allowResidentLoss','resBio','saveResidentsGitBtn','saveResidentsGitBtn2'].map(id => [id,{ value: 'old', checked: false }]));
  const statuses = [], state = {};
  const sandbox = { state, structuredClone, document: { addEventListener() {} }, $: id => elements.get(id),
    ensureResidents() {}, residents: () => state.residentsData,
    readResidentForm: () => { state.residentsData.residents[0].bio = elements.get('resBio').value; },
    renderAll: () => { if (state.residentsData) state.residentsData.residents[0].normalizerDefault = ''; }, updateSaveStatus() {},
    setStatus: (...args) => statuses.push(args), __modules: [{}, {}, { patchResidentDocument }],
    AdminStaging: { resetPending() {}, client(scope) {
      const op = createStagingOperation(config(), { scope, fetch: mock.fetch });
      return { ...op, requireMediaParent: op.bind, finish: () => op.finish({ dispatch: true }) };
    } } };
  sandbox.window = sandbox;
  const source = (await read('js/auto-github-load.js')).replace(/const modules = Promise\.all\(\[[\s\S]*?\]\);/, 'const modules = Promise.resolve(__modules);');
  vm.runInNewContext(source, sandbox);
  await sandbox.loadResidentsFromGithub(); elements.get('resBio').value = 'new';
  await sandbox.saveResidentsToGithub();
  const saved = JSON.parse(mock.text(path)); assert.equal(saved.residents[0].bio, 'new');
  assert.deepEqual(saved.residents[0].portal, raw.residents[0].portal); assert.equal(saved.residents[0].unknown, 42);
  assert.equal(saved.residents[0].normalizerDefault, undefined);
  assert.match(statuses.at(-1)[1], /Content gespeichert.*nicht gestartet/);
  assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, 1);
});
