import {
    IAgentRuntime,
    UUID,
    IDatabaseAdapter,
    ModelProviderName,
    Character,
    Provider,
    Action,
    Evaluator,
    Plugin,
    IMemoryManager,
    ICacheManager,
    ServiceType,
    Service,
    Memory,  // Add this
    State,   // Add this
    Actor    // Add this if not already imported
} from '@ai16z/eliza';

import { PostgresLandDataProvider} from '@ai16z/plugin-unreal'

import {Redis} from 'ioredis';
import { config } from '../config/index.js';
import { LandDatabaseAdapter } from '@ai16z/plugin-unreal';

export class TestRuntime implements IAgentRuntime {
    private redis: Redis;
    databaseAdapter: IDatabaseAdapter;

    constructor( databaseAdapter: IDatabaseAdapter) {

        this.databaseAdapter = databaseAdapter;

        const dbAdapter = new LandDatabaseAdapter(databaseAdapter)
        const landDataProvider = new PostgresLandDataProvider(dbAdapter);

        this.redis = new Redis({
            host: config.cache.host,
            port: config.cache.port
        });
    }

    async set<T>(key: string, value: T): Promise<void> {
        await this.redis.set(key, JSON.stringify(value));
    }

    async delete(key: string): Promise<void>{
        await this.redis.del(key);
    }

    async get<T>(key: string): Promise<T | undefined > {
        const value = await this.redis.get(key);
        if (!value) return undefined;
        try {
            return JSON.parse(value) as T;
        } catch {
            return undefined;
        }
    }

    get cacheManager(): ICacheManager {
        return {
            get: async <T>(key: string): Promise<T | undefined > => await this.get<T>(key),
            set: async <T>(key: string, value: T): Promise<void> => this.set<T>(key, value),
            delete: async (key: string): Promise<void> => this.delete(key),
        };
    }
    // Add these methods to the TestRuntime class
async registerMemoryManager(manager: IMemoryManager): Promise<void> {
    // No-op for testing
}

getMemoryManager(name: string): IMemoryManager | null {
    return null; // For testing
}

getService<T extends Service>(serviceType: ServiceType): T | null {
    return this.services.get(serviceType) as T || null;
}

registerService(service: Service): void {
    this.services.set(service.serviceType as ServiceType, service);
}

async processActions(): Promise<void> {
    // No-op for testing
}

async evaluate(): Promise<string[]> {
    return []; // For testing
}

    agentId: UUID = 'test-agent' as UUID;
    serverUrl: string = 'http://localhost:3000';

    token: string | null = null;
    modelProvider: ModelProviderName = 'test-provider' as ModelProviderName;
    imageModelProvider: ModelProviderName = 'test-image-provider' as ModelProviderName;
    character: Character = {} as Character;
    providers: Provider[] = [];
    actions: Action[] = [];
    evaluators: Evaluator[] = [];
    plugins: Plugin[] = [];

    fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        throw new Error('Fetch not implemented in test runtime');
    };

    // Minimal managers
    messageManager = {} as IMemoryManager;
    descriptionManager = {} as IMemoryManager;
    documentsManager = {} as IMemoryManager;
    knowledgeManager = {} as IMemoryManager;
    loreManager = {} as IMemoryManager;
    services = new Map<ServiceType, Service>();
    clients: Record<string, any> = {};

    async initialize(): Promise<void> {
        // No-op for testing
    }

getSetting(key: string): string | null {
    return null; // For testing
}

getConversationLength(): number {
    return 0; // For testing
}

async ensureParticipantExists(userId: UUID, roomId: UUID): Promise<void> {
    // No-op for testing
}

async ensureUserExists(userId: UUID, userName: string | null, name: string | null, source: string | null): Promise<void> {
    // No-op for testing
}

async registerPlugin(plugin: Plugin): Promise<void> {
    this.plugins.push(plugin);
}

async registerProvider(provider: Provider): Promise<void> {
    this.providers.push(provider);
}

async registerAction(action: Action): Promise<void> {
    this.actions.push(action);
}

async registerEvaluator(evaluator: Evaluator): Promise<void> {
    this.evaluators.push(evaluator);
}

async getPlugin(name: string): Promise<Plugin | null> {
    return this.plugins.find(p => p.name === name) || null;
}
async composeState(message: Memory, additionalKeys?: { [key: string]: unknown }): Promise<State> {
    return {} as State; // For testing
}


async updateRecentMessageState(state: State): Promise<State> {
    return state; // For testing
}

async getMemory(key: string): Promise<Memory | null> {
    return null; // For testing
}

async storeMemory(memory: Memory): Promise<void> {
    // No-op for testing
}

async updateMemory(memory: Memory): Promise<void> {
    // No-op for testing
}
// Add these methods to your TestRuntime class
async getConversationId(): Promise<UUID> {
    return 'test-conversation' as UUID;
}

async getUser(): Promise<Actor> {
    return {} as Actor;
}

async getParticipant(): Promise<Actor> {
    return {} as Actor;
}

async getParticipants(): Promise<Actor[]> {
    return [];
}

async getRecentMessage(): Promise<Memory | null> {
    return null;
}

async getRecentMessages(count: number): Promise<Memory[]> {
    return [];
}

async getRecentMessageState(): Promise<State | null> {
    return null;
}
async ensureConnection(userId: UUID, roomId: UUID, userName?: string, userScreenName?: string, source?: string): Promise<void> {
    // No-op for testing
}

async getConnectionInfo(): Promise<{
    userId: UUID;
    roomId: UUID;
    userName?: string;
    userScreenName?: string;
    source?: string;
}> {
    return {
        userId: 'test-user' as UUID,
        roomId: 'test-room' as UUID
    };
}

async getContext(): Promise<Record<string, any>> {
    return {}; // For testing
}

async setContext(context: Record<string, any>): Promise<void> {
    // No-op for testing
}

async ensureParticipantInRoom(userId: UUID, roomId: UUID): Promise<void> {
    // No-op for testing
}

async ensureRoomExists(roomId: UUID): Promise<void> {
    // No-op for testing
}
}
