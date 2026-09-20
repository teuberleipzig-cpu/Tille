import { planSiteComposition } from './composition-plan.mjs';
import { prepareCompositionOutput } from './composition-output.mjs';
import { materializeSnapshot } from './snapshot-materializer.mjs';
import { validateComposedSite } from './composition-validator.mjs';

export function composeSite(options) {
  const plan = planSiteComposition(options);
  const output = prepareCompositionOutput(options.repoRoot || process.cwd(), options.output);
  // Filter before materialization: equivalent to full namespace removal followed
  // by overlay, without ever writing obsolete/recovery bytes to the output.
  materializeSnapshot(options.repoRoot || process.cwd(), output, plan.expected);
  return validateComposedSite({ ...options, output, contentTreeSha: plan.contentTreeSha });
}
