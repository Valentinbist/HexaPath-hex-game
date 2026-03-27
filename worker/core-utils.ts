/**
 * Core utilities for the Cloudflare Durable Object template
 */

export interface Env {
    ASSETS: Fetcher;
    GAME_ROOMS: DurableObjectNamespace;
}
