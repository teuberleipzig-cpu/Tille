import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('feedback.html');
const privacy = read('datenschutz.html');
const handler = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];

test('feedback uses the confirmed recipient and no legacy redirect or stale copy', () => {
  assert.match(html, /action="https:\/\/formsubmit.co\/distillery.feedback@gmail.com" method="POST"/);
  assert.doesNotMatch(html, /teuber1995@gmail\.com|github\.io\/Tille\/feedback-thanks|Later we can replace/);
  assert.match(html, /name="_next" value=""/);
  assert.match(html, /FormSubmit/);
  assert.match(html, /href="datenschutz.html"/);
});

for (const origin of ['https://www-test.distillery.de', 'https://www.distillery.de', 'http://localhost:4321']) {
  test(`submit derives redirect solely from ${origin}, preserves timestamp/subject`, () => {
    const fields = { 'submitted-at': {value:''}, 'feedback-subject': {value:''} };
    const next = {value:'https://untrusted.example/'};
    let submit;
    const form = {addEventListener: (type, cb) => {assert.equal(type,'submit'); submit=cb;},
      querySelector: selector => {assert.equal(selector,'[name="_next"]');return next;}};
    vm.runInNewContext(handler, {document:{querySelector:()=>form,getElementById:id=>fields[id]},
      window:{location:{origin,search:'?next=https://untrusted.example/'}}});
    submit.call(form);
    assert.equal(next.value, origin + '/feedback-thanks.html');
    assert.ok(Number.isFinite(Date.parse(fields['submitted-at'].value)));
    assert.equal(fields['feedback-subject'].value, 'New Distillery website feedback – ' + fields['submitted-at'].value);
  });
}

test('disabled tracking performs neither beacon nor fetch nor listener registration', () => {
  let requests=0, listeners=0;
  const window={};
  vm.runInNewContext(read('assets/tracking.js'), {window, document:{addEventListener:()=>listeners++},
    navigator:{sendBeacon:()=>requests++}, fetch:()=>requests++});
  assert.equal(window.distilleryTracking.enabled(),false);
  assert.equal(window.distilleryTracking.track('fixture'),false);
  assert.equal(requests,0);assert.equal(listeners,0);
});

test('privacy remains a draft with factual pipeline and disabled tracking', () => {
  for(const fact of ['Arbeitsstand','FormSubmit','distillery.feedback@gmail.com','Google Apps Script','Trello',
    'technisch deaktiviert','keine Trackingevents versendet','rechtliche und organisatorische Prüfung']) assert.ok(privacy.includes(fact),fact);
  assert.doesNotMatch(privacy,/nicht personenbezogenes Nutzungs-Tracking geplant/);
  const checklist=read('LEGAL_PRIVACY_REVIEW_INFO_NEEDED.md');
  for(const open of ['Finale rechtliche Prüfung von FormSubmit','Gmail-/Google-Verarbeitung','Apps-Script-Verarbeitung','Trello-Verarbeitung','Löschprozess']) {
    assert.match(checklist,new RegExp('\\[ \\] '+open));
  }
});

test('tracked active website/config files contain no old feedback address', () => {
  const files=execFileSync('git',['ls-files','-z'],{cwd:new URL('..',import.meta.url),encoding:'utf8'}).split('\0');
  for(const file of files.filter(p=>/\.(html|js|mjs|json|ya?ml|conf|php)$/i.test(p) && !p.startsWith('tests/'))) {
    assert.equal(read(file).includes('teuber1995'+'@gmail.com'),false,file);
  }
});
