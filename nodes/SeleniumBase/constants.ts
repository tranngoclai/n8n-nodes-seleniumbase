/**
 * Constants for SeleniumBase node
 */

import type { SeleniumBaseJobStatus } from './types';

/** Default polling interval in seconds */
export const DEFAULT_POLLING_INTERVAL = 5;

/** Default timeout in seconds */
export const DEFAULT_TIMEOUT = 600;

/** Milliseconds per second conversion factor */
export const MILLISECONDS_PER_SECOND = 1000;

/**
 * Job status constants matching API responses
 */
export const JOB_STATUS: Record<Uppercase<SeleniumBaseJobStatus>, SeleniumBaseJobStatus> = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
} as const;
