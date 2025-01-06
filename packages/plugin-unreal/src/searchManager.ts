import { LandMemorySystem } from './database/land_memory_system';
import { LandSearchParams, LandPlotMemory, SearchMetadata, SearchMetadataSchema, ZoningType, PlotSize, BuildingType } from './types';
import { IAgentRuntime } from '@ai16z/eliza';
import { PostgresLandDataProvider } from './adapters/PostgresLandDataProvider';
import { LandDatabaseAdapter } from './database/land_database_adapter';
import { PostgresDatabaseAdapter } from "@ai16z/adapter-postgres";
import { elizaLogger } from "@ai16z/eliza";

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

export interface SearchSession {
    status: "ACTIVE" | "INACTIVE";
    lastQuery: string | null;
    results: LandPlotMemory[];
    filters: Partial<LandSearchParams>;
}

export class PropertySearchManager {
    private memorySystem: LandMemorySystem;

    constructor(private runtime: IAgentRuntime) {
        //elizaLogger.info("🚀 Initializing PropertySearchManager...");

        if (!runtime.databaseAdapter) {
            throw new Error("Database adapter not found in runtime");
        }

        //elizaLogger.info("✅ Using database adapter:", runtime.databaseAdapter.constructor.name);

        const dbAdapter = new LandDatabaseAdapter(runtime.databaseAdapter);
        const landDataProvider = new PostgresLandDataProvider(dbAdapter);
        this.memorySystem = new LandMemorySystem(landDataProvider);

        elizaLogger.info("✅ PropertySearchManager initialization complete");
    }

    async createSearchSession(userId: string, initialState: SearchSession) {
        await this.runtime.cacheManager.set(`property-search-${userId}`, initialState);
    }

    async getSearchSession(userId: string): Promise<SearchSession | null> {
        const session = await this.runtime.cacheManager.get<SearchSession>(
            `property-search-${userId}`
        );
        return session || null;
    }

    async updateSearchResults(userId: string, results: LandPlotMemory[]) {
        const session = await this.getSearchSession(userId);
        if (!session) return;

        session.results = results;
        await this.runtime.cacheManager.set(`property-search-${userId}`, session);
    }

    async executeSearch(searchMetadata: SearchMetadata): Promise<LandPlotMemory[] | null> {
        const { metadata } = searchMetadata;
        const searchParams: Partial<LandSearchParams> = {};

        // Handle array fields with proper typing
        if (metadata.neighborhoods?.length) {
            searchParams.neighborhoods = metadata.neighborhoods;
        }
        if (metadata.zoningTypes?.length) {
            searchParams.zoningTypes = metadata.zoningTypes as ZoningType[];
        }
        if (metadata.plotSizes?.length) {
            searchParams.plotSizes = metadata.plotSizes as PlotSize[];
        }
        if (metadata.buildingTypes?.length) {
            searchParams.buildingTypes = metadata.buildingTypes as BuildingType[];
        }

        // Handle distances
        if (metadata.distances?.ocean || metadata.distances?.bay) {
            searchParams.distances = {};
            ['ocean', 'bay'].forEach(type => {
                const distance = metadata.distances?.[type];
                if (distance) {
                    searchParams.distances![type] = {
                        maxMeters: distance.maxMeters,
                        category: distance.category
                    };
                }
            });
        }

        // Handle building
        if (metadata.building?.floors || metadata.building?.height) {
            searchParams.building = {};
            ['floors', 'height'].forEach(prop => {
                const value = metadata.building?.[prop];
                if (value) {
                    searchParams.building![prop] = value;
                }
            });
        }

        // Handle rarity
        if (metadata.rarity?.rankRange) {
            searchParams.rarity = { rankRange: metadata.rarity.rankRange };
        }

        // Return null if no search parameters were defined
        if (Object.keys(searchParams).length === 0) {
            return null;
        }

        console.log('Search parameters:', searchParams);
        return await this.memorySystem.searchPropertiesByParams(searchParams);
    }
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
]
