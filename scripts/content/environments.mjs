// B1a contract only: no branch creation, browser routing or deployment.
import { validateEnvironment } from '../filemaker/contracts-v2/event-contract.mjs';

export { validateEnvironment };
export const ENVIRONMENTS = Object.freeze({
  staging: Object.freeze({ environment: 'staging', contentRef: 'content/staging', buildTarget: 'staging', publicHost: 'www-test.distillery.de' }),
  live: Object.freeze({ environment: 'live', contentRef: 'content/live', buildTarget: 'live', publicHost: 'www.distillery.de' })
});

export function resolveEnvironment(value) {
  return ENVIRONMENTS[validateEnvironment(value)];
}

export function bindContentEnvironment(environment, contentRef) {
  const config = resolveEnvironment(environment);
  if (contentRef !== config.contentRef) throw new Error('Content-Ref passt nicht zur gewählten Umgebung.');
  return config;
}
