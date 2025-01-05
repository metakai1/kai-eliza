import { LandDatabaseAdapter } from '../database/land_database_adapter';
import { ILandDataProvider } from '../property-search-design/interfaces/ILandDataProvider';
import { LandPlotMemory, LandSearchParams } from '../types';
import { UUID } from '@ai16z/eliza';

export class PostgresLandDataProvider implements ILandDataProvider {
    constructor(private readonly dbAdapter: LandDatabaseAdapter) {}

    async createLandMemory(memory: LandPlotMemory): Promise<void> {
        await this.dbAdapter.createLandMemory(memory);
    }

    async getLandMemoryById(id: string): Promise<LandPlotMemory> {
        return await this.dbAdapter.getLandMemoryById(id);
    }

    async getLandMemories(roomId: UUID): Promise<LandPlotMemory[]> {
        return await this.dbAdapter.getLandMemories(roomId);
    }

    async removeLandMemory(id: string): Promise<void> {
        await this.dbAdapter.removeLandMemory(id);
    }

    async removeAllLandMemories(roomId: UUID): Promise<void> {
        await this.dbAdapter.removeAllLandMemories(roomId);
    }

    async searchLandMemories(roomId: UUID, query: string, params?: Partial<LandSearchParams>): Promise<LandPlotMemory[]> {
        return await this.dbAdapter.searchLandMemories(roomId, query, params);
    }

    async updateLandMemory(memory: LandPlotMemory): Promise<void> {
        await this.dbAdapter.updateLandMemory(memory);
    }
}
