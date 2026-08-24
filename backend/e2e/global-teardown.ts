import { teardownAll, closeDb } from './helpers/db';

export default async function globalTeardown() {
  try {
    await teardownAll('e2e-');
  } catch (err) {
    console.error('Global teardown error:', err);
  }
  await closeDb();
}
