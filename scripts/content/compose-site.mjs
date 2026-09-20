import { parseArgs } from 'node:util';
import { composeSite } from './site-composition.mjs';

try {
  const { values } = parseArgs({ options: Object.fromEntries(
    ['environment', 'code-sha', 'content-ref', 'content-sha', 'output'].map(key => [key, { type: 'string' }])
  ), strict: true, allowPositionals: false });
  const report = composeSite({ environment: values.environment, codeSha: values['code-sha'],
    contentRef: values['content-ref'], contentSha: values['content-sha'], output: values.output });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
