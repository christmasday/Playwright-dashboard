import { ensureSeedAdmin } from './helpers/db';

export default async function globalSetup() {
  await ensureSeedAdmin();
}
