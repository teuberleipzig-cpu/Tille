import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/staging-container-smoke.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('smoke checks out exact PR head and captures content SHA once before composing', () => {
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /git fetch --no-tags origin refs\/heads\/content\/staging:refs\/remotes\/origin\/content\/staging/);
  assert.equal((workflow.match(/git rev-parse refs\/remotes\/origin\/content\/staging/g) || []).length, 1);
  assert.match(workflow, /--code-sha "\$CODE_SHA"/);
  assert.match(workflow, /--content-sha "\$content_sha"/);
  assert.match(workflow, /--content-ref content\/staging/);
  assert.match(workflow, /--environment staging/);
  assert.match(workflow, /--output "\$RUNNER_TEMP\/composed-site" > "\$RUNNER_TEMP\/composition-report.json"/);
  assert.ok(workflow.indexOf('content_sha=') < workflow.indexOf('node scripts/content/compose-site.mjs'));
});

test('both Docker smoke builds use isolated staging context, not live ref or working tree', () => {
  assert.match(workflow, /-t tille-staging-smoke "\$RUNNER_TEMP\/composed-site"/);
  assert.match(workflow, /-t tille-default-smoke "\$RUNNER_TEMP\/composed-site"/);
  assert.equal((workflow.match(/docker build/g) || []).length, 2);
  assert.match(workflow, /--build-arg DEPLOY_TARGET=staging/);
  assert.doesNotMatch(workflow, /refs\/heads\/content\/live|--environment live|--content-ref content\/live/);
});

test('HTTP safety matrix and recovery 404 probes remain, without body logging on failure', () => {
  for (const value of ['nginx -t', '/sitemap.xml', 'noindex, nofollow, noarchive', 'no-store',
    '/docker/nginx.conf', '/docker/nginx.staging.conf', '/robots.staging.txt',
    '/public/residents/data/residents-backup-before-restore.json', '/public/residents/data/recovery-note.txt']) {
    assert.ok(workflow.includes(value), value);
  }
  assert.match(workflow, /for endpoint in \/sitemap.xml .*residents-backup-before-restore.json .*recovery-note.txt; do\n\s+assert_status "\$endpoint" 404/);
  assert.match(workflow, /Disallow:/);
  assert.doesNotMatch(workflow, /cat "\$body"/);
});

test('CI runs Linux composition tests with read-only permissions and no publishing', () => {
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /node --test .*tests\/content-composition.test.mjs/);
  assert.doesNotMatch(workflow, /contents: write|packages: write|pull_request_target|workflow_dispatch|docker push|gh pr merge|--auto|\bssh\b|ghcr.io/);
  assert.match(workflow, /'scripts\/content\/\*\*'/);
});

const eventSuites = ['event-contract-v2', 'monthly-event-storage', 'event-multidate-storage',
  'filemaker-event-intake', 'filemaker-staging-workspace', 'event-seo', 'staging-acceptance',
  'staging-cutover-integration', 'dates-mobile', 'admin-event-image-only',
  'admin-event-image-only-ui', 'admin-staging-ui', 'event-categories'].map(name => `tests/${name}.test.mjs`);
const originalPaths = ['docker/**', 'scripts/content/**', 'tests/content-*.test.mjs',
  'tests/staging-cutover-integration.test.mjs', 'tests/staging-acceptance.test.mjs',
  'tests/helpers/staging-acceptance-fixture.mjs', 'robots.txt', 'robots.staging.txt',
  '.github/workflows/docker-publish.yml', '.github/workflows/staging-container-smoke.yml'];
const eventPaths = ['index.html', 'event.html', 'public/site/js/event-date-rules.js',
  'public/site/js/event-presentation.js', 'public/site/js/event-category-filters.js',
  'public/site/js/event-storage-model.js', 'public/site/js/event-store.js',
  'assets/dates-mobile.css', 'assets/event-categories.css', 'scripts/events/event-seo.mjs',
  'scripts/events/prepare-event-seo.mjs', 'scripts/filemaker/contracts-v2/dates.mjs',
  'scripts/filemaker/contracts-v2/event-contract.mjs', 'scripts/filemaker/filemaker-event-model.mjs',
  'public/admin/index.html', 'public/admin/js/auto-github-load.js', 'public/admin/js/events-meta.js',
  'public/admin/js/core/event-storage-admin.js', 'public/admin/js/core/event-image-only-save.js',
  'tests/event-contract-v2-timetable.test.mjs', 'tests/fixtures/event-contract-v2.json',
  'tests/fixtures/filemaker-event.json', 'tests/helpers/event-categories-fixture.mjs',
  'tests/helpers/serve-event-categories-fixture.mjs', 'tests/helpers/content-bootstrap-fixture.mjs',
  'tests/helpers/admin-staging-github.mjs', 'tests/helpers/portal-github-fixture.mjs',
  'tests/helpers/staging-acceptance-fixture.mjs', ...eventSuites];

// Deliberately supports this workflow's simple YAML structure, not arbitrary YAML.
function prPaths(source) {
  const trigger = /^on:\n([\s\S]*?)(?=^\S)/m.exec(source)?.[1];
  assert.ok(trigger, 'on block missing');
  assert.deepEqual([...trigger.matchAll(/^  ([\w_]+):/gm)].map(m => m[1]), ['pull_request']);
  assert.match(trigger, /^    branches:\n      - main\n    paths:\n/m);
  const paths = /^    paths:\n((?:      - '[^'\n]+'\n)+)\s*$/m.exec(trigger)?.[1];
  assert.ok(paths, 'literal pull_request.paths block missing');
  return [...paths.matchAll(/- '([^']+)'/g)].map(m => m[1]);
}

function covered(patterns, file) {
  return patterns.some(pattern => {
    const expression = pattern.split('**').map(part => part.split('*')
      .map(text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
    return new RegExp(`^${expression}$`).test(file);
  });
}

function fullSuites(source) {
  const jobs = source.split('\njobs:\n')[1];
  assert.ok(jobs, 'jobs missing');
  assert.doesNotMatch(jobs, /^    (?:if|continue-on-error):/m);
  return jobs.split(/\n      - /).flatMap(step => {
    if (!/\brun:/.test(step)) return [];
    const run = /^        run: (.+)\n/m.exec(step);
    if (!run) return [];
    const body = run[1] === '|' ? step.slice(run.index + run[0].length).split('\n')
      .filter(line => line.startsWith('          ')).map(line => line.slice(10)).join('\n') : run[1];
    const commands = body.split('\n').filter(line => /^node --test tests\//.test(line));
    if (commands.length) assert.doesNotMatch(step, /^        (?:if|continue-on-error):/m);
    return commands.flatMap(line => {
      assert.match(line, /^node --test(?: tests\/[\w-]+\.test\.mjs)+$/);
      return line.slice('node --test '.length).split(' ');
    });
  });
}

test('actual main PR paths cover event runtime, suites and fixtures but not unrelated content/docs', () => {
  const patterns = prPaths(workflow);
  for (const path of originalPaths) assert.ok(patterns.includes(path), `original path removed: ${path}`);
  for (const file of eventPaths) assert.ok(covered(patterns, file), `uncovered PR path: ${file}`);
  for (const file of ['docs/EVENT_CATEGORIES_C2_QA.md', 'public/events/data/months/2026-10.json',
    'events/fixture/index.html', 'public/residents/data/residents.json', 'public/gallery/data/gallery.json',
    'public/site/data/site-navigation.json', 'assets/tracking.js', 'public/site/js/not-event.js']) {
    assert.equal(covered(patterns, file), false, file);
  }
});

test('all required event suites and timetable execute fully once in unconditional run steps', () => {
  const suites = fullSuites(workflow);
  for (const file of [...eventSuites, 'tests/event-contract-v2-timetable.test.mjs']) {
    assert.equal(suites.filter(suite => suite === file).length, 1, file);
  }
});

test('isolated original trigger and partial command reproduce the missing CI coverage', () => {
  const original = `on:\n  pull_request:\n    branches:\n      - main\n    paths:\n${originalPaths.map(path => `      - '${path}'\n`).join('')}\npermissions:\n  contents: read\n`;
  assert.equal(covered(prPaths(original), 'public/site/js/event-presentation.js'), false);
  assert.equal(covered(prPaths(original + '# index.html\n'), 'index.html'), false);
  const partial = `name: fixture\njobs:\n  check:\n    steps:\n      - name: partial\n        run: node --test --test-name-pattern='prepared cutover' tests/filemaker-event-intake.test.mjs\n`;
  assert.deepEqual(fullSuites(partial), []);
  assert.deepEqual(fullSuites(partial.replace('        run:', '        # run:')), []);
});

test('trigger and execution guards reject unsafe or non-executing alternatives', () => {
  assert.throws(() => prPaths(workflow.replace('      - main\n', '      - content/staging\n')));
  assert.throws(() => prPaths(workflow.replace('on:\n', 'on:\n  push:\n')));
  assert.throws(() => fullSuites(workflow.replace('      - name: Test full event regressions',
    '      - name: Test full event regressions\n        if: false')));
  assert.match(workflow, /^permissions:\n  contents: read\n\njobs:/m);
  assert.doesNotMatch(workflow, /^\s+(?:permissions|[\w-]+): write\b|continue-on-error|pull_request_target|workflow_dispatch|workflow_run|repository_dispatch|gh workflow|git push|docker push|ghcr\.io|\bssh\b/m);
  assert.equal((workflow.match(/^permissions:/gm) || []).length, 1);
  assert.doesNotMatch(workflow, /^[ \t]+permissions:/m);
});
