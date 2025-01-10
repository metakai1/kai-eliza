import { elizaLogger, UUID, stringToUuid, splitChunks } from "@ai16z/eliza";
import { LandDatabaseAdapter } from "./land_database_adapter";
import { LandPlotMemory, LandSearchParams, DEFAULT_MATCH_COUNT, LandKnowledgeItem, LandPlotMetadata } from "./types";
import { LAND_ROOM_ID, LAND_AGENT_ID, AGENT_ID } from "./types";
import { v4 as uuidv4 } from 'uuid';

export const LAND_QUERY_SYSTEM_PROMPT = `
You are a real estate search assistant for a futuristic city. Convert natural language queries into structured search parameters.

Given a user query, respond with a JSON object containing:
1. A natural language description for embedding matching
2. Search metadata parameters

Example Response Format:
{
    "searchText": "Large plot in Nexus neighborhood close to ocean with tall building potential",
    "metadata": {
        "neighborhood": "Nexus",
        "minPlotArea": 5000,
        "maxOceanDistance": 500,
        "minFloors": 50
    }
}

Keep the searchText natural and descriptive while being specific about requirements.
`;

export class LandMemorySystem {
    private readonly roomId: UUID = LAND_ROOM_ID; // TODO: Make this dynamic
    private readonly agentId: UUID = LAND_AGENT_ID;
    private readonly userId: UUID = AGENT_ID;

    constructor(
        private readonly database: LandDatabaseAdapter,
        private readonly embedder: {
            embedText: (text: string) => Promise<number[]>;
        }
    ) {}

    // create function to remove all LandMemories
    async removeAllLandMemories(): Promise<void> {
        await this.database.removeAllLandMemories(LAND_ROOM_ID);
    }

    async createLandMemoryFromCSV(csvRow: any): Promise<void> {
        try {
            const metadata: LandPlotMetadata = {
                rank: parseInt(csvRow['Rank']),
                name: csvRow['Name'],
                neighborhood: csvRow['Neighborhood'],
                zoning: csvRow['Zoning Type'],
                plotSize: csvRow['Plot Size'],
                buildingType: csvRow['Building Size'],
                distances: {
                    ocean: {
                        meters: parseInt(csvRow['Distance to Ocean (m)']),
                        category: csvRow['Distance to Ocean']
                    },
                    bay: {
                        meters: parseInt(csvRow['Distance to Bay (m)']),
                        category: csvRow['Distance to Bay']
                    }
                },
                building: {
                    floors: {
                        min: parseInt(csvRow['Min # of Floors']),
                        max: parseInt(csvRow['Max # of Floors'])
                    },
                    height: {
                        min: parseFloat(csvRow['Min Building Height (m)']),
                        max: parseFloat(csvRow['Max Building Height (m)'])
                    }
                },
                plotArea: parseFloat(csvRow['Plot Area (m²)'])
            };

            await this.storeProperty(metadata);
        } catch (error) {
            elizaLogger.error('Error creating land memory:', {
                error: error instanceof Error ? error.message : String(error),
                csvRow
            });
            throw error;
        }
    }

    async searchPropertiesByQuery(
        query: string,
        metadata: Partial<LandSearchParams> = {},
        limit: number = DEFAULT_MATCH_COUNT
    ): Promise<LandPlotMemory[]> {
        try {

            console.log('Search query:', query);
            const embedding = await this.embedder.embedText(query);

            console.log('Search query embedding:', embedding);

            const results = await this.database.searchLandByEmbedding(
                embedding
            );
            console.log('Search results:', results);
            return results.slice(0, limit);
        } catch (error) {
            elizaLogger.error('Error searching properties:', {
                error: error instanceof Error ? error.message : String(error),
                query,
                metadata
            });
            throw error;
        }
    }

    async searchPropertiesByParams(searchParams: Partial<LandSearchParams> = {}): Promise<LandPlotMemory[]> {
        const results = await this.database.searchLandByMetadata(searchParams);
        return results;
    }

    /**
     * Get properties within a specific rarity range
     */
    async getPropertiesByRarity(
        minRank: number,
        maxRank: number,
        limit: number = DEFAULT_MATCH_COUNT
    ): Promise<LandPlotMemory[]> {
        try {
            const results = await this.database.getPropertiesByRarityRange(minRank, maxRank);
            return results.slice(0, limit);
        } catch (error) {
            elizaLogger.error('Error getting properties by rarity:', {
                error: error instanceof Error ? error.message : String(error),
                minRank,
                maxRank
            });
            throw error;
        }
    }

    async storePropertyItem(
        item: LandKnowledgeItem,
        chunkSize: number = 512,
        bleed: number = 20
    ): Promise<UUID> {
        try {
            // First create the main land memory
            const mainMemory: LandPlotMemory = {
                id: item.id,
                userId: this.userId,
                agentId: this.agentId,
                roomId: this.roomId,
                content: item.content
                //embedding: await this.embedder.embedText(item.content.text)
            };
            await this.database.createLandMemory(mainMemory);   
            return item.id;
        } catch (error) {
            elizaLogger.error('Error setting land knowledge:', {
                error: error instanceof Error ? error.message : String(error),
                item
            });
            throw error;
        }
    }

    async getLandKnowledgeById(id: UUID): Promise<LandKnowledgeItem | undefined> {
        const memory = await this.database.getLandMemoryById(id);
        if (!memory) return undefined;

        return {
            id: memory.id,
            content: memory.content,
 //           text: memory.text,
 //         metadata: memory.metadata
        };
    }

    async getPropertyDataById(id: UUID): Promise<LandPlotMemory | undefined> {
        const result = await this.database.getLandMemoryById(id);
        return result;
    }

    /**
     * Stores a property in the land memory system
     * @param metadata The land plot metadata to store
     * @returns The UUID of the stored property
     */
    async storeProperty(metadata: LandPlotMetadata): Promise<UUID> {
        const description = this.generatePropertyDescription(metadata);
        const knowledgeItem: LandKnowledgeItem = {
            id: stringToUuid(description+Date.now()),
            content: {
                text: description,
                metadata: metadata
            },
        };

        return await this.storePropertyItem(knowledgeItem);
    }

    /**
     * Generates a natural language description of a property from its metadata
     */
    private generatePropertyDescription(metadata: LandPlotMetadata): string {
        const description = `${metadata.name} is a ${metadata.plotSize} ${metadata.zoning} plot in ${metadata.neighborhood}. ` +
            `It is located ${metadata.distances.ocean.meters}m from the ocean and ${metadata.distances.bay.meters}m from the bay. ` +
            `The building can have between ${metadata.building.floors.min} and ${metadata.building.floors.max} floors, ` +
            `with heights from ${metadata.building.height.min}m to ${metadata.building.height.max}m. ` +
            `The plot area is ${metadata.plotArea}m².`;
        return description;
    }
}

    
    /**
     * Search for properties using natural language query and metadata filters
     */
/*     async searchProperties(
        metadata: Partial<LandSearchParams> = {},
        limit: number = DEFAULT_MATCH_COUNT
    ): Promise<LandPlotMemory[]> {
        try {
            const constructedQuery = this.generateQueryFromMetadata(metadata);

            //console.log('Search query:', query);
            const embedding = await this.embedder.embedText(constructedQuery);

            //console.log('Search query embedding:', embedding);

            const results = await this.database.searchLandByCombinedCriteria(
                embedding,
                metadata
            );
            return results.slice(0, limit);
        } catch (error) {
            elizaLogger.error('Error searching properties:', {
                error: error instanceof Error ? error.message : String(error),
                query,
                metadata
            });
            throw error;
        }
    } */

        /**
     * Creates a land memory and its fragments from a knowledge item
/*      */
 /*    async setLandKnowledge(
        item: LandKnowledgeItem,
        chunkSize: number = 512,
        bleed: number = 20
    ): Promise<UUID> {
        try {
            // First create the main land memory
            const mainMemory: LandPlotMemory = {
                id: item.id,
                userId: this.userId,
                agentId: this.agentId,
                roomId: this.roomId,
                content: item.content,
                embedding: await this.embedder.embedText(item.content.text)
            };
            await this.database.createLandMemory(mainMemory);

            // Then split into fragments if needed
            const preprocessed = item.content.text;
            const fragments = await splitChunks(preprocessed, chunkSize, bleed);

            // Create fragment memories
            let fragmentCounter = 0;
            for (const fragment of fragments) {
                fragmentCounter++;
                const fragmentMemory: LandPlotMemory = {
                    id: stringToUuid(`${item.id}-fragment-${fragmentCounter}`),
                    userId: LAND_AGENT_ID,
                    agentId: LAND_AGENT_ID,
                    roomId: LAND_ROOM_ID,
                    content: {
                        text: fragment,
                        metadata: item.content.metadata, // Keep the same metadata
                        source: item.id
                    },
                    embedding: await this.embedder.embedText(fragment)
        };
                console.log("fragment memory text:", fragmentMemory.content.text);
                await this.database.createLandMemory(fragmentMemory);
                console.log("Fragment memory embedding:", fragmentMemory.embedding);
            }
        return item.id;
        } catch (error) {
            elizaLogger.error('Error setting land knowledge:', {
                error: error instanceof Error ? error.message : String(error),
                item
            });
            throw error;
        }
    }
 */ 