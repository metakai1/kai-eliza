import { IAgentRuntime } from '@ai16z/eliza';
import Redis from 'ioredis';
import { config } from './config';

export class TestRuntime implements IAgentRuntime {
    private redis: Redis;

    constructor() {
        this.redis = new Redis({
            host: config.cache.host,
            port: config.cache.port
        });
    }

    async get<T>(key: string): Promise<T | null> {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
    }

    async set<T>(key: string, value: T): Promise<void> {
        await this.redis.set(key, JSON.stringify(value));
    }

    get cacheManager() {
        return {
            get: <T>(key: string) => this.get<T>(key),
            set: <T>(key: string, value: T) => this.set(key, value)
        };
    }
}
