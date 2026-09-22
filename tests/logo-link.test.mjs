import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('shared NIPRAS logo uses the existing router as a keyboard-accessible home link', async () => {
  const source = await readFile(new URL('../src/components/common/Logo.jsx', import.meta.url), 'utf8');
  assert.match(source, /import \{ Link \} from "react-router-dom"/);
  assert.match(source, /<Link[\s\S]*?to="\/"/);
  assert.match(source, /cursor-pointer/);
  assert.doesNotMatch(source, /window\.location/);
});
