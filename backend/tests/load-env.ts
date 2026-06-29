import dotenv from 'dotenv';
import path from 'path';

// Must run before any test file imports src/config/env.ts (via setupFiles in jest.config.js).
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
