import { VsphereClient } from '../../src/index.js';

export function getTestConfig() {
  const host = process.env.VC_HOST;
  const username = process.env.VC_USER;
  const password = process.env.VC_PASS;

  if (!host || !username || !password) {
    throw new Error('Set VC_HOST, VC_USER, VC_PASS to run integration tests');
  }

  return {
    host,
    username,
    password,
    insecure: process.env.VC_INSECURE === 'true',
    logger: {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    },
  };
}

export async function createTestClient(): Promise<VsphereClient> {
  const config = getTestConfig();
  return VsphereClient.connect(config);
}
