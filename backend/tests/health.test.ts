import { api } from './setup';

describe('Health Check', () => {
  it('GET /health returns status', async () => {
    const response = await api.get('/health');

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('version');
  });
});

describe('Auth Routes', () => {
  it('POST /api/v1/auth/register validates request body', async () => {
    const response = await api.post('/api/v1/auth/register').send({
      email: 'invalid',
      password: 'short',
      displayName: 'A',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/login validates request body', async () => {
    const response = await api.post('/api/v1/auth/login').send({
      email: 'not-an-email',
      password: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/logout requires authentication', async () => {
    const response = await api.post('/api/v1/auth/logout');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
