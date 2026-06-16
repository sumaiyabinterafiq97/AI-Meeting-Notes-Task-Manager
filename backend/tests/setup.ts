import dotenv from 'dotenv';
import path from 'path';
import request from 'supertest';

dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

// Import app after env is loaded
const { createApp } = require('../src/app') as typeof import('../src/app');

export const app = createApp();
export const api = request(app);
