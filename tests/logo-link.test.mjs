import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('shared NIPRAS logo is a static brand and cannot navigate or change the session', async () => {
  const source = await readFile(new URL('../src/components/common/Logo.jsx', import.meta.url), 'utf8');
  assert.match(source, /alt="شعار نبراس"/);
  assert.match(source, /cursor-default/);
  assert.doesNotMatch(source, /<Link\b|<a\b|<button\b|onClick|onKeyDown|tabIndex/);
  assert.doesNotMatch(source, /window\.location|navigate\(|signOut\(|sessionStorage/);
});
