/**
 * Compile-time guarantee that the website implementation (./remote) can stand in for the
 * on-device one (./local): everything the UI imports from api/client must exist in both.
 * This file is never imported at runtime.
 */

import type * as Local from './local';
import type * as Remote from './remote';

export const remoteSatisfiesLocal = (remote: typeof Remote): typeof Local => remote;
