import { LandDatabaseAdapter } from '../database/land_database_adapter';
import { ILandDataProvider } from '../interfaces/ILandDataProvider';
import { LandPlotMemory, LandSearchParams } from '../types';
import { UUID } from '@ai16z/eliza';

export class PostgresLandDataProvider implements ILandDataProvider {
    constructor(private readonly dbAdapter: LandDatabaseAdapter) {}

    async createLandMemory(memory: LandPlotMemory): Promise<void> {
        await this.dbAdapter.createLandMemory(memory);
    }

    async getLandMemories(roomId: UUID): Promise<LandPlotMemory[]> {
        return await this.dbAdapter.getLandMemories(roomId);
    }

    async removeAllLandMemories(roomId: UUID): Promise<void> {
        await this.dbAdapter.removeAllLandMemories(roomId);
    }

    async updateLandMemory(memory: LandPlotMemory): Promise<void> {
        // TODO: Implement this method in LandDatabaseAdapter
        throw new Error('Method not implemented: updateLandMemory');
    }

    async searchLandByMetadata(params: LandSearchParams): Promise<LandPlotMemory[]> {
        return await this.dbAdapter.searchLandByMetadata(params);
    }
}
