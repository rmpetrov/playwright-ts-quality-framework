export function testSupportEnabled(environment: NodeJS.ProcessEnv): boolean {
  const enabled = environment.ENABLE_TEST_SUPPORT === 'true';
  if (enabled && environment.NODE_ENV !== 'test') {
    throw new Error('ENABLE_TEST_SUPPORT=true requires NODE_ENV=test.');
  }
  return enabled;
}
