// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Session, User } from "$models";

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: Session;
		}
		interface PageData {
			session: Session;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
