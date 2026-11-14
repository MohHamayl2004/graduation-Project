import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import { Route, Routes } from 'react-router-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

test('lesson 1-1 renders the existing living book and its interactive leaves', async () => {
  const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { default: Lesson } = await server.ssrLoadModule('/src/pages/Lesson/index.jsx');
    const { default: FlipbookPage } = await server.ssrLoadModule('/src/pages/Lesson/FlipbookPages.jsx');
    const { lesson11Leaves } = await server.ssrLoadModule('/shared/lessonFlipbook.js');
    const { lessonBooks } = await server.ssrLoadModule('/shared/lessonBook.js');
    const { AuthProvider } = await server.ssrLoadModule('/src/context/AuthContext.jsx');
    const render = path => renderToStaticMarkup(React.createElement(AuthProvider, null, React.createElement(StaticRouter, { location: path }, React.createElement(Routes, null, React.createElement(Route, { path: '/lesson/:code', element: React.createElement(Lesson) })))));
    const html = render('/lesson/1-1');
    assert.match(html, /living-screen/);
    assert.match(html, /id="app-sidebar"/);
    assert.doesNotMatch(html, /<canvas|book-layout-with-activity/);
    assert.match(html, /NIPRAS_math_lesson_1-1.pdf/);
    const leaves = lesson11Leaves.map((leaf, index) => renderToStaticMarkup(React.createElement(FlipbookPage, { leaf, index, book: lessonBooks[0] })));
    assert.equal(leaves.length, 10);
    assert.match(leaves[0], /books\/lesson-1-1\/page-4.webp/);
    assert.match(leaves[0], /NIPRAS_math_lesson_1-1.pdf#page=1/);
    assert.match(leaves[0], /أسئلة الصفحة/);
    assert.match(leaves[0], /تكبير صفحة الكتاب/);
    assert.match(leaves[8], /اختر سؤالًا من صفحة 8/);
    assert.match(leaves[3], /ق\(س\) = س³ − ٥س \+ ٣/);
    assert.match(leaves[3], /type="range"/);
    assert.match(leaves[3], /role="slider"/);
    assert.match(leaves[5], /aria-current="step"/);
    assert.match(leaves[5], /اسأل نبراس/);
    const other = render('/lesson/1-2');
    assert.match(other, /قواعد الاشتقاق/);
    assert.match(other, /<canvas/);
    assert.doesNotMatch(other, /discovery-workspace/);
    assert.doesNotMatch(other, /secant-title/);
  } finally { await server.close(); }
});

test('graph points support keyboard movement and isolate SVG definitions', async () => {
  const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { default: DiscoveryGraph, pointAfterKey } = await server.ssrLoadModule('/src/pages/Lesson/DiscoveryGraph.jsx');
    assert.equal(pointAfterKey(-1, 'ArrowRight'), -0.9);
    assert.equal(pointAfterKey(-1, 'ArrowLeft'), -1.1);
    assert.equal(pointAfterKey(2, 'ArrowUp'), 2);
    assert.equal(pointAfterKey(-2, 'ArrowDown'), -2);
    assert.equal(pointAfterKey(0, 'Home'), -2);
    assert.equal(pointAfterKey(0, 'End'), 2);
    assert.equal(pointAfterKey(0, 'Tab'), null);
    const graph = () => React.createElement(DiscoveryGraph, { points: [-1, 2], onChange() {}, triangle: true });
    const html = renderToStaticMarkup(React.createElement('div', null, graph(), graph()));
    assert.equal((html.match(/role="slider"/g) || []).length, 4);
    assert.equal((html.match(/tabindex="0"/g) || []).length, 4);
    assert.match(html, /aria-valuenow="-1"/);
    assert.match(html, /aria-valuemin="-2"/);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
  } finally { await server.close(); }
});
