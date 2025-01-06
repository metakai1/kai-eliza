import { LandPlotMemory, LandSearchParams } from '../types';
import { UUID } from '@ai16z/eliza';

export interface ILandDataProvider {
    createLandMemory(memory: LandPlotMemory): Promise<void>;
    getLandMemories(roomId: UUID): Promise<LandPlotMemory[]>;
    //removeAllLandMemories(roomId: UUID): Promise<void>;
    updateLandMemory(memory: LandPlotMemory): Promise<void>;
    searchLandByMetadata(params: LandSearchParams): Promise<LandPlotMemory[]>;
}
