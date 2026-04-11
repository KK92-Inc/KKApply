// ============================================================================
// W2Inc, 2025, All Rights Reserved.
// See README in the root project for more information.
// ============================================================================

import pino from 'pino';
import { dev } from '$app/environment';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ============================================================================

const file = join(tmpdir(), `pino-${process.pid}-example`);
const transport = pino.transport({
	targets: [
		{
			target: 'pino-pretty',
			options: {
				destination: !dev && file,
				colorize: true
			}
		}
	]
});

export const logger = pino({ level: dev ? 'debug' : 'info' }, transport);
