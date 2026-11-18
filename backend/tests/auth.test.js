import request from 'supertest';
import app from '../src/server.js';
import { setupTestDB } from './setup.js';

describe('DOERA AI — Authentication & Security Tests', () => {
  setupTestDB();

  it('should successfully register a new user and return a JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Architect',
        email: 'alice@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('Alice Architect');
    expect(res.body.user.email).toBe('alice@example.com');
  });

  it('should reject registration if email is duplicate', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Password123!',
    });

    const duplicateRes = await request(app).post('/api/auth/register').send({
      name: 'Alice Again',
      email: 'alice@example.com',
      password: 'DifferentPassword!',
    });

    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.error).toContain('already exists');
  });

  it('should log in an existing user with valid credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Bob Builder',
      email: 'bob@example.com',
      password: 'SecretPassword123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'SecretPassword123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('bob@example.com');
  });

  it('should reject login with wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Charlie',
      email: 'charlie@example.com',
      password: 'CorrectPassword!',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'charlie@example.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid credentials');
  });

  it('should protect private routes and return current user profile', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'David',
      email: 'david@example.com',
      password: 'Password123!',
    });

    const token = regRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('david@example.com');
  });

  it('should enforce data isolation between users', async () => {
    // User 1
    const u1 = await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'u1@example.com',
      password: 'Password123!',
    });
    // User 2
    const u2 = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'u2@example.com',
      password: 'Password123!',
    });

    // User 1 sends message
    await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${u1.body.token}`)
      .send({ message: 'User 1 private task request' });

    // User 2 fetches conversations
    const u2Convs = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${u2.body.token}`);

    expect(u2Convs.body.conversations.length).toBe(0);
  });
});
