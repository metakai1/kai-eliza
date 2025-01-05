import { LandMemorySystem } from './land_memory_system';
import { LandSearchParams, LandPlotMemory, SearchMetadata, SearchMetadataSchema } from './types';
import { IAgentRuntime } from '@ai16z/eliza';
import { PostgresLandDataProvider } from './adapters/PostgresLandDataProvider';
import { LandDatabaseAdapter } from './land_database_adapter';

interface PropertyResult {
    rank: number;
    name: string;
    neighborhood: string;
    zoningType: string;
    plotSize: string;
    buildingSize: string;
    distances: {
        ocean: number;
        bay: number;
    };
    building: {
        floors: {
            min: number;
            max: number;
        };
        height: {
            min: number;
            max: number;
        };
    };
    plotArea: number;
}

const sampleProperties: PropertyResult[] = [
    {
        rank: 44,
        name: "SM-577",
        neighborhood: "Space Mind",
        zoningType: "Mixed Use",
        plotSize: "Mega",
        buildingSize: "Highrise",
        distances: { ocean: 830, bay: 742 },
        building: {
            floors: { min: 44, max: 55 },
            height: { min: 222, max: 277 }
        },
        plotArea: 7169
    },
    {
        rank: 45,
        name: "HH-878",
        neighborhood: "Haven Heights",
        zoningType: "Industrial",
        plotSize: "Giga",
        buildingSize: "Lowrise",
        distances: { ocean: 383, bay: 673 },
        building: {
            floors: { min: 7, max: 9 },
            height: { min: 36, max: 45 }
        },
        plotArea: 9363
    },
    {
        rank: 47,
        name: "DZ-225",
        neighborhood: "District ZERO",
        zoningType: "Industrial",
        plotSize: "Giga",
        buildingSize: "Lowrise",
        distances: { ocean: 1006, bay: 1090 },
        building: {
            floors: { min: 6, max: 8 },
            height: { min: 32, max: 40 }
        },
        plotArea: 10095
    },
    {
        rank: 51,
        name: "NS-931",
        neighborhood: "North Star",
        zoningType: "Mixed Use",
        plotSize: "Macro",
        buildingSize: "Highrise",
        distances: { ocean: 453, bay: 766 },
        building: {
            floors: { min: 37, max: 46 },
            height: { min: 188, max: 234 }
        },
        plotArea: 5323
    },
    {
        rank: 54,
        name: "FL-90",
        neighborhood: "Flashing Lights",
        zoningType: "Mixed Use",
        plotSize: "Mid",
        buildingSize: "Highrise",
        distances: { ocean: 2536, bay: 302 },
        building: {
            floors: { min: 42, max: 52 },
            height: { min: 212, max: 264 }
        },
        plotArea: 4603
    },
    {
        rank: 56,
        name: "FL-99",
        neighborhood: "Flashing Lights",
        zoningType: "Mixed Use",
        plotSize: "Mid",
        buildingSize: "Highrise",
        distances: { ocean: 889, bay: 1077 },
        building: {
            floors: { min: 36, max: 45 },
            height: { min: 181, max: 226 }
        },
        plotArea: 4081
    },
    {
        rank: 59,
        name: "FL-133",
        neighborhood: "Flashing Lights",
        zoningType: "Mixed Use",
        plotSize: "Mammoth",
        buildingSize: "Lowrise",
        distances: { ocean: 2709, bay: 361 },
        building: {
            floors: { min: 16, max: 19 },
            height: { min: 80, max: 99 }
        },
        plotArea: 7393
    }
];

export interface SearchSession {
    status: "ACTIVE" | "INACTIVE";
    lastQuery: string | null;
    results: LandPlotMemory[];
    filters: Partial<LandSearchParams>;
}

export class PropertySearchManager {
    private memorySystem: LandMemorySystem;

    constructor(private runtime: IAgentRuntime) {
        // Create database adapter and wrap it in our data provider
        const dbAdapter = new LandDatabaseAdapter(runtime.databaseAdapter.connectionConfig);
        const landDataProvider = new PostgresLandDataProvider(dbAdapter);

        // Create embedder from runtime
        const embedder = {
            embedText: async (text: string) => {
                return await runtime.embedder.embedText(text);
            }
        };

        // Initialize memory system with the data provider
        this.memorySystem = new LandMemorySystem(landDataProvider, embedder);
    }

    async createSearchSession(userId: string, initialState: SearchSession) {
        await this.runtime.setMemory(userId + "_property_search", initialState);
    }

    async getSearchSession(userId: string): Promise<SearchSession | null> {
        return await this.runtime.getMemory(userId + "_property_search");
    }

    async updateSearchResults(userId: string, results: LandPlotMemory[]) {
        const session = await this.getSearchSession(userId);
        if (!session) return;

        session.results = results;
        await this.runtime.setMemory(userId + "_property_search", session);
    }

    async executeSearch(searchMetadata: SearchMetadata): Promise<LandPlotMemory[]> {
        // Validate search metadata using Zod schema
        const validatedMetadata = SearchMetadataSchema.parse(searchMetadata);

        // Convert SearchMetadata to LandSearchParams
        const searchParams: Partial<LandSearchParams> = {
            neighborhoods: validatedMetadata.metadata.neighborhood,
            zoningTypes: validatedMetadata.metadata.zoningTypes,
            plotSizes: validatedMetadata.metadata.plotSizes,
            buildingTypes: validatedMetadata.metadata.buildingTypes,
            distances: {
                ocean: validatedMetadata.metadata.distances?.ocean ? {
                    maxMeters: validatedMetadata.metadata.distances.ocean.maxMeters,
                    category: validatedMetadata.metadata.distances.ocean.category
                } : undefined,
                bay: validatedMetadata.metadata.distances?.bay ? {
                    maxMeters: validatedMetadata.metadata.distances.bay.maxMeters,
                    category: validatedMetadata.metadata.distances.bay.category
                } : undefined
            },
            building: {
                floors: validatedMetadata.metadata.building?.floors,
                height: validatedMetadata.metadata.building?.height
            },
            rarity: {
                rankRange: validatedMetadata.metadata.rarity?.rankRange
            }
        };

        // Use the memory system's search functionality
        return await this.memorySystem.mockSearchPropertiesByParams(searchParams);
        // return await this.memorySystem.searchPropertiesByParams(searchParams);
    }
}