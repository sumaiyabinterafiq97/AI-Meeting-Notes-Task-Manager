import request from 'supertest';

// .env.test is loaded in tests/load-env.ts before this module is imported.

// Import app after env is loaded
const { createApp } = require('../src/app') as typeof import('../src/app');

export const app = createApp();
export const api = request(app);
