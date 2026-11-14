import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { randomBytes, randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import User from '../models/User.js';
import { signToken } from '../services/tokenService.js';
import { connectTestDatabase, disconnectTestDatabase } from './helpers/testDatabase.js';

test('authenticated book position and verified activity persist in a real isolated database', { skip: !process.env.MONGO_URI_TEST, timeout: 90000 }, async () => {
  assert.match(new URL(process.env.MONGO_URI_TEST).pathname, /^\/nipras_book_test_[a-f0-9]+$/);
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  try {
    await connectTestDatabase();
    const user = await User.create({ fullName: 'اختبار الكتاب', email: `${randomUUID()}@example.invalid`, passwordHash: 'not-used' });
    const token = await signToken(user._id);
    const app = createApp();
    const auth = req => req.auth(token, { type: 'bearer' });
    assert.equal((await auth(request(app).put('/api/lesson-books/1-1/progress')).send({ page: 2 })).status, 200);
    const attempt = await auth(request(app).post('/api/lesson-books/1-1/attempts')).send({ activityId: 'example-1-rate', answer: '−٢' });
    assert.equal(attempt.status, 200); assert.equal(attempt.body.correct, true);
    await disconnectTestDatabase();
    await connectTestDatabase();
    const restored = await auth(request(app).get('/api/lesson-books/1-1/progress'));
    assert.equal(restored.status, 200);
    assert.equal(restored.body.progress.lastPage, 2);
    assert.deepEqual(restored.body.progress.completedActivities, ['example-1-rate']);
    assert.equal(restored.body.progress.attempts.at(-1).correct, true);
  } finally {
    if (mongoose.connection.readyState === 1) {
      assert.match(mongoose.connection.name, /^nipras_book_test_[a-f0-9]+$/);
      await mongoose.connection.dropDatabase();
    }
    await disconnectTestDatabase();
  }
});
