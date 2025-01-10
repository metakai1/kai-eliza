import { LandMemorySystem } from './database/land_memory_system';
import { LandSearchParams, LandPlotMemory, SearchMetadata, QueryExtractionResult, ZoningType, PlotSize, BuildingType, OrderByParameter, LandPlotMemoryNFT } from './types';
import { IAgentRuntime } from '@ai16z/eliza';
import { PostgresLandDataProvider } from './adapters/PostgresLandDataProvider';
import { LandDatabaseAdapter } from './database/land_database_adapter';
import { PostgresDatabaseAdapter } from "@ai16z/adapter-postgres";
import { elizaLogger } from "@ai16z/eliza";
import { ReservoirAPI } from './nft/ReservoirAPI';

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

    async initializeNewSearchSession(userId: string): Promise<SearchSession> {
        const initialSession: SearchSession = {
            status: "ACTIVE",
            lastQuery: null,
            results: [],
            filters: {}
        };

        await this.createSearchSession(userId, initialSession);
        return initialSession;
    }

    async endSearchSession(userId: string): Promise<SearchSession | null> {
        const session = await this.runtime.cacheManager.get<SearchSession>(
            `property-search-${userId}`
        );

        if (session) {
            // Update the session status to INACTIVE
            const endedSession: SearchSession = {
                ...session,
                status: "INACTIVE"
            };

            // Save the updated session state
            await this.runtime.cacheManager.set(
                `property-search-${userId}`,
                endedSession
            );

            return endedSession;
        }

        return null;
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

        // Handle names array
        if (metadata.names?.length) {
            searchParams.names = metadata.names;
        }
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

    async executeSearchWithOrdering(searchMetadata: SearchMetadata, orderBy?: OrderByParameter): Promise<LandPlotMemory[] | null> {
        const { metadata } = searchMetadata;
        const searchParams: Partial<LandSearchParams> = {};

        // Handle names array
        if (metadata.names?.length) {
            searchParams.names = metadata.names;
        }
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
        return await this.memorySystem.searchPropertiesByParamsV2(searchParams, orderBy);
    }

    async executeSearchV2(searchMetadata: SearchMetadata, queryExtraction?: QueryExtractionResult): Promise<LandPlotMemoryNFT[]> {
        // First get base results using existing search with ordering
        const results = await this.executeSearchWithOrdering(searchMetadata, queryExtraction?.orderByParameter) as LandPlotMemory[];

        if (!results || results.length === 0) {
            return [];
        }

        // Initialize ReservoirAPI
        const reservoirAPI = new ReservoirAPI();

        try {
            // Fetch NFT prices
            const nftPrices = await reservoirAPI.getPricesForCollection();
            if (!nftPrices || nftPrices.length === 0) {
                return results as LandPlotMemoryNFT[];
            }

            // Create price lookup map
            const priceMap = new Map(nftPrices.map(nft => [nft.tokenId, nft.price]));

            const enrichedResults = results.map(result => {
                const tokenId = result.content.metadata.tokenId;
                if (tokenId && priceMap.has(tokenId)) {
                    result.content.metadata.nftData = {
                        price: priceMap.get(tokenId),
                        lastUpdated: new Date().toISOString()
                    };
                }
                return result as LandPlotMemoryNFT;
            });

            // filter enrichedResults to remove properties that are not for sale if salesOnly is true
            if (queryExtraction?.salesOnly) {
                return enrichedResults.filter(result =>
                    result.content?.metadata?.nftData?.price !== undefined &&
                    result.content?.metadata?.nftData?.price > 0
                );
            }

            return enrichedResults;

        } catch (error) {
            console.error('Error enriching search results with NFT data:',
                error instanceof Error ? error.message : error);
            // Return original results if NFT enrichment fails
            return results as LandPlotMemoryNFT[];
        }
    }
}
