import { sql } from "bun";

export default {
  async scheduled(controller: Bun.CronController) {
		await sql`
			DELETE FROM session
			WHERE "expiresAt" < (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
		`;
  },
};
