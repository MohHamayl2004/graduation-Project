import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('login uses a contained RTL card with a real form and tactile buttons', async () => {
  const page = await readFile(new URL('../src/pages/Login/index.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/pages/Login/login.css', import.meta.url), 'utf8').catch(() => '');

  assert.match(page, /login-shell/);
  assert.match(page, /login-brand-panel/);
  assert.match(page, /login-book/);
  assert.match(page, /type="email"/);
  assert.match(page, /showPassword \? "text" : "password"/);
  assert.match(page, /duo-press/);
  assert.match(styles, /\.duo-press:active/);
  assert.match(styles, /translateY\(3px\)/);
});

test('login card uses the compact 800 by 550 desktop size', async () => {
  const styles = await readFile(new URL('../src/pages/Login/login.css', import.meta.url), 'utf8');

  assert.match(styles, /\.login-card\{[^}]*width:min\(800px,100%\)[^}]*min-height:550px/);
});
