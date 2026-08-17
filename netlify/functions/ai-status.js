import { aiEnabled } from '../../src/ai.js';
import { json } from './_helpers.js';

export const handler = async () => json(200, { enabled: aiEnabled() });
