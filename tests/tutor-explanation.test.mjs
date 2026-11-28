import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { explanationActions, canOfferExplanationActions } from '../src/pages/AITutor/teachingActions.js';

test('follow-up actions are grounded in the most recent completed, sourced response', () => {
  const answer = { role: 'assistant', status: 'complete', content: 'شرح', sources: [{ document: 'math', pages: [19] }] };
  assert.equal(canOfferExplanationActions(answer, true), true);
  assert.equal(canOfferExplanationActions(answer, false), false);
  for (const status of ['streaming', 'refused', 'failed', 'interrupted']) assert.equal(canOfferExplanationActions({ ...answer, status }, true), false);
  assert.equal(canOfferExplanationActions({ ...answer, sources: [] }, true), false);
  assert.deepEqual(explanationActions.map(action => action.label), ['اشرح بطريقة أبسط', 'حل معي', 'أعطني مثالًا', 'اختبرني']);
  assert.equal(explanationActions.find(action => action.id === 'practice').pending, true);
  for (const action of explanationActions) assert.ok(action.prompt.split(/\s+/).length <= 8);
});

test('answer renders actions only when available and discloses missing sources', async () => {
  const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { default: AssistantMessage } = await server.ssrLoadModule('/src/pages/AITutor/components/AssistantMessage.jsx');
    const answer = { role: 'assistant', status: 'complete', content: 'الشرح', sources: [{ document: 'math', lesson: '1-2', pages: [19] }] };
    const render = message => renderToStaticMarkup(React.createElement(AssistantMessage, { message, onAction() {}, isLatest: true }));
    const grounded = render(answer);
    assert.match(grounded, /اشرح بطريقة أبسط/);
    assert.match(grounded, /حل معي/);
    assert.match(grounded, /disabled=""[^>]*>اختبرني/);
    assert.match(grounded, /صفحة ملف PDF ١٩/);
    assert.doesNotMatch(grounded, /href=/);
    const unavailable = render({ ...answer, sources: [] });
    assert.match(unavailable, /لم يتوفر مرجع من الكتاب/);
    assert.doesNotMatch(unavailable, /اشرح بطريقة أبسط/);
    assert.doesNotMatch(render({ ...answer, status: 'streaming' }), /اشرح بطريقة أبسط/);
  } finally { await server.close(); }
});
