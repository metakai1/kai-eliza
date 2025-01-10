import { LandPlotMemory, LandSearchParams } from '../types';
import { UUID } from '@ai16z/eliza';

export interface ILandDataProvider {
    createLandMemory(memory: LandPlotMemory): Promise<void>;
    getLandMemoryById(id: string): Promise<LandPlotMemory>;
    getLandMemories(roomId: UUID): Promise<LandPlotMemory[]>;
    removeLandMemory(id: string): Promise<void>;
    removeAllLandMemories(roomId: UUID): Promise<void>;
    searchLandMemories(roomId: UUID, query: string, params?: Partial<LandSearchParams>): Promise<LandPlotMemory[]>;
    updateLandMemory(memory: LandPlotMemory): Promise<void>;
    searchLandByMetadata(params: LandSearchParams): Promise<LandPlotMemory[]>;
}
