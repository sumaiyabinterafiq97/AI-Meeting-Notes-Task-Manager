import { api } from '../setup';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import { testUser, createPasswordResetTokenForUser } from '../helpers/auth-helper';
import { REFRESH_TOKEN_COOKIE } from '../../src/lib/cookies';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('Auth Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('registers a new user and sets refresh cookie', async () => {
    const response = await api.post('/api/v1/auth/register').send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.accessToken).toBeDefined();
    expect(response.headers['set-cookie']?.[0]).toContain(REFRESH_TOKEN_COOKIE);
  });

  it('rejects duplicate registration', async () => {
    await api.post('/api/v1/auth/register').send(testUser);

    const response = await api.post('/api/v1/auth/register').send(testUser);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('logs in with valid credentials', async () => {
    await api.post('/api/v1/auth/register').send(testUser);

    const response = await api.post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
  });

  it('rejects invalid login credentials', async () => {
    await api.post('/api/v1/auth/register').send(testUser);

    const response = await api.post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'WrongPass1',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns current user from GET /auth/me', async () => {
    const register = await api.post('/api/v1/auth/register').send(testUser);
    const token = register.body.accessToken as string;

    const response = await api
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(testUser.email);
    expect(response.body.displayName).toBe(testUser.displayName);
    expect(response.body.createdAt).toBeDefined();
  });

  it('rejects unauthenticated access to /auth/me', async () => {
    const response = await api.get('/api/v1/auth/me');

    expect(response.status).toBe(401);
  });

  it('refreshes access token with valid refresh cookie', async () => {
    const register = await api.post('/api/v1/auth/register').send(testUser);
    const cookies = register.headers['set-cookie'];

    const response = await api.post('/api/v1/auth/refresh').set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.headers['set-cookie']?.[0]).toContain(REFRESH_TOKEN_COOKIE);
  });

  it('logs out and revokes refresh token', async () => {
    const register = await api.post('/api/v1/auth/register').send(testUser);
    const token = register.body.accessToken as string;
    const cookies = register.headers['set-cookie'];

    const logout = await api
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', cookies);

    expect(logout.status).toBe(204);

    const refresh = await api.post('/api/v1/auth/refresh').set('Cookie', cookies);
    expect(refresh.status).toBe(401);
  });

  it('resets password with valid token', async () => {
    const register = await api.post('/api/v1/auth/register').send(testUser);
    const userId = register.body.user.id as string;
    const resetToken = await createPasswordResetTokenForUser(userId);

    const response = await api.post('/api/v1/auth/reset-password').send({
      token: resetToken,
      password: 'NewPassword2',
    });

    expect(response.status).toBe(200);

    const login = await api.post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'NewPassword2',
    });

    expect(login.status).toBe(200);
  });

  it('forgot-password returns generic message', async () => {
    const response = await api.post('/api/v1/auth/forgot-password').send({
      email: 'nobody@example.com',
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('If an account exists');
  });
});
