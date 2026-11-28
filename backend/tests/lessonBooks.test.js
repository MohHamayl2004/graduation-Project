import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createLessonBooksRouter } from '../routes/lessonBooksRoutes.js';
import { errorHandler } from '../middleware/errorMiddleware.js';

function fixture() {
  const records = new Map();
  const key = query => `${query.owner}:${query.lessonId}`;
  const model = {
    findOne: query => ({ lean: async () => records.get(key(query)) || null }),
    findOneAndUpdate: (query, update) => ({ lean: async () => {
      const id = key(query), record = records.get(id) || { lessonId: query.lessonId, lastPage: 1, completedActivities: [], attempts: [] };
      if (update.$set) Object.assign(record, update.$set);
      if (update.$push) record.attempts.push(update.$push.attempts.$each[0]);
      if (update.$addToSet && !record.completedActivities.includes(update.$addToSet.completedActivities)) record.completedActivities.push(update.$addToSet.completedActivities);
      records.set(id, record); return record;
    } }),
  };
  const app = express(); app.use(express.json());
  app.use(createLessonBooksRouter({ model, guard: (req, res, next) => { if (!req.get('X-User')) return res.sendStatus(401); req.user = { _id: req.get('X-User') }; next(); } }));
  app.use(errorHandler); return app;
}

test('lesson progress is authenticated, scoped to the owner, and validates page numbers', async () => {
  const app = fixture();
  assert.equal((await request(app).get('/1-1/progress')).status, 401);
  assert.equal((await request(app).put('/1-1/progress').set('X-User', 'alice').send({ page: 6 })).status, 400);
  assert.equal((await request(app).put('/1-9/progress').set('X-User', 'alice').send({ page: 1 })).status, 400);
  assert.equal((await request(app).put('/1-1/progress').set('X-User', 'alice').send({ page: 4 })).body.progress.lastPage, 4);
  assert.equal((await request(app).get('/1-1/progress').set('X-User', 'alice')).body.progress.lastPage, 4);
  assert.equal((await request(app).get('/1-1/progress').set('X-User', 'bob')).body.progress, null);
});

test('server grades only the verified activity and stores actual attempts', async () => {
  const app = fixture();
  assert.equal((await request(app).post('/1-1/attempts').set('X-User', 'alice').send({ activityId: 'example-1-rate', answer: '٢' })).body.correct, false);
  const correct = await request(app).post('/1-1/attempts').set('X-User', 'alice').send({ activityId: 'example-1-rate', answer: '−٢' });
  assert.equal(correct.body.correct, true);
  assert.deepEqual(correct.body.progress.completedActivities, ['example-1-rate']);
  assert.equal(correct.body.progress.attempts.length, 2);
  assert.equal((await request(app).post('/1-1/attempts').set('X-User', 'alice').send({ activityId: 'other', answer: '-2' })).status, 400);
  assert.equal((await request(app).post('/1-1/attempts').set('X-User', 'alice').send({ activityId: 'example-1-rate', answer: '2+2' })).status, 400);
});
