import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import request from 'supertest';
import { createApp } from '../app.js';
import { academicStreams } from '../../shared/academicStreams.js';
import { validateSignupInput } from '../validation/authValidation.js';
import { connectTestDatabase, clearTestCollections, disconnectTestDatabase } from './helpers/testDatabase.js';
import User from '../models/User.js';
import SchoolCoupon from '../models/SchoolCoupon.js';
import Membership from '../models/Membership.js';

const student = { fullName: 'طالب تجربة', email: 'student@example.invalid', password: 'Original-password-1', birthDate: '2008-05-10', stream: 'hotel', city: 'نابلس' };

test('registration validates all six streams, real calendar dates, and bcrypt password limits', () => {
  for (const password of ['Password عربي 123', 'Password 123', 'كلمةمرور123456']) assert.throws(() => validateSignupInput({ ...student, password }), { code: 'INVALID_PASSWORD_FORMAT' });
  for (const { value } of academicStreams) assert.equal(validateSignupInput({ ...student, stream: value }).stream, value);
  for (const update of [{ stream: 'unknown' }, { birthDate: '2020-02-31' }, { birthDate: '2099-01-01' }, { birthDate: '' }, { password: 'x'.repeat(73) }, { fullName: 'x' }]) {
    assert.throws(() => validateSignupInput({ ...student, ...update }), { code: 'VALIDATION_ERROR' });
  }
});

test('repeated authentication attempts are rate limited', async () => {
  const app = createApp();
  for (let index = 0; index < 30; index++) assert.equal((await request(app).post('/api/auth/login').send({ email: 'invalid', password: '' })).status, 400);
  const blocked = await request(app).post('/api/auth/login').send({ email: 'invalid', password: '' });
  assert.equal(blocked.status, 429); assert.equal(blocked.body.code, 'AUTH_RATE_LIMITED'); assert.ok(blocked.headers['retry-after']);
});

test('real database: immediate signup, saved student profile, discount coupon and login', { skip: !process.env.MONGO_URI_TEST, timeout: 120000 }, async (t) => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET ||= crypto.randomBytes(32).toString('hex');
  try {
    await connectTestDatabase();
    await Promise.all([User.init(), SchoolCoupon.init()]);
    await clearTestCollections();
    const app = createApp();
    await SchoolCoupon.create([
      { code: 'PARTNER-20', schoolName: 'مدرسة التجربة', discountPercent: 20 },
      { code: 'EXPIRED-20', schoolName: 'مدرسة التجربة', discountPercent: 20, expiresAt: new Date(0) },
      { code: 'INACTIVE-20', schoolName: 'مدرسة التجربة', discountPercent: 20, active: false }
    ]);
    let user, token;
    await t.test('invalid coupons are rejected and valid discounts are controlled by the server', async () => {
      for (const schoolCode of ['BAD-CODE', 'EXPIRED-20', 'INACTIVE-20']) {
        const invalid = await request(app).post('/api/auth/signup').send({ ...student, schoolCode });
        assert.equal(invalid.status, 400); assert.equal(invalid.body.code, 'INVALID_SCHOOL_CODE');
      }
      const response = await request(app).post('/api/auth/signup').send({ ...student, schoolCode: ' partner-20 ', discountPercent: 99 });
      assert.equal(response.status, 201); assert.ok(response.body.token); assert.ok(response.body.currentWorkspace);
      assert.equal(response.body.user.schoolBenefit.discountPercent, 20);
      assert.equal(response.body.requiresEmailVerification, undefined);
      assert.equal(response.body.user.passwordHash, undefined);
      token = response.body.token;
      user = await User.findOne({ email: student.email });
      assert.equal(user.birthDate.toISOString().slice(0, 10), student.birthDate);
      assert.equal(user.stream, student.stream); assert.equal(user.fullName, student.fullName);
      assert.equal(user.passwordHash, undefined);
      assert.equal(await Membership.countDocuments({ userId: user._id }), 1);
    });
    await t.test('login works immediately and me returns the persisted student identity', async () => {
      const login = await request(app).post('/api/auth/login').send({ email: ' STUDENT@EXAMPLE.INVALID ', password: student.password });
      assert.equal(login.status, 200); assert.ok(login.body.token);
      const me = await request(app).get('/api/auth/me').auth(token, { type: 'bearer' });
      assert.equal(me.status, 200); assert.equal(me.body.user.email, student.email);
      assert.equal(me.body.user.fullName, student.fullName); assert.equal(me.body.user.stream, student.stream);
      assert.equal(me.body.user.birthDate.slice(0, 10), student.birthDate);
      assert.equal(me.body.user.passwordHash, undefined);
      assert.equal((await request(app).post('/api/auth/signup').send(student)).status, 409);
      assert.equal((await request(app).post('/api/auth/login').send({ ...student, password: 'Incorrect-password' })).status, 401);
    });
    await t.test('inactive accounts cannot sign in or use existing tokens', async () => {
      await User.updateOne({ _id: user._id }, { $set: { status: 'INACTIVE' } });
      assert.equal((await request(app).post('/api/auth/login').send(student)).status, 403);
      assert.equal((await request(app).get('/api/auth/me').auth(token, { type: 'bearer' })).status, 401);
    });
  } finally {
    if (User.db.readyState === 1) await clearTestCollections();
    await disconnectTestDatabase();
    if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
  }
});
