import { elizaLogger, UUID, stringToUuid, splitChunks } from "@ai16z/eliza";
import { LandDatabaseAdapter } from "./land_database_adapter";
import { LandPlotMemory, LandSearchParams, DEFAULT_MATCH_COUNT, LandKnowledgeItem } from "./types";
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
    constructor(
        private readonly database: LandDatabaseAdapter,
        private readonly embedder: {
            embedText: (text: string) => Promise<number[]>;
        }
    ) {}

    /**
     * Converts a CSV row into a natural language description for embedding
     */
    private generatePlotDescription(plot: any): string {
        return `${plot.Name} is a ${plot['Plot Size']} ${plot['Zoning Type']} plot in ${plot.Neighborhood}. ` +
               `It is a ${plot['Building Size']} building with ${plot['Min # of Floors']} to ${plot['Max # of Floors']} floors. ` +
               `The plot area is ${plot['Plot Area (m²)']}m² with building heights from ${plot['Min Building Height (m)']}m to ${plot['Max Building Height (m)']}m. ` +
               `Located ${plot['Distance to Ocean']} from ocean (${plot['Distance to Ocean (m)']}m) and ${plot['Distance to Bay']} from bay (${plot['Distance to Bay (m)']}m).`;
    }

    /**
     * Create a new land memory from CSV data
     */

    async createLandMemoryFromCSV(csvRow: any): Promise<void> {
        try {
            const description = this.generatePlotDescription(csvRow);
            const embedding = await this.embedder.embedText(description);

            const memory: LandPlotMemory = {
                id: stringToUuid(`description`),  // TODO FIX THIS
                userId:  LAND_AGENT_ID,  // Since this is a system-generated memory
                agentId: LAND_AGENT_ID,
                roomId: LAND_ROOM_ID,
                content: {
                    text: description,
                    metadata: {
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
                    }
                },
                embedding
            };

            await this.database.createLandMemory(memory);
        } catch (error) {
            elizaLogger.error('Error creating land memory:', {
                error: error instanceof Error ? error.message : String(error),
                csvRow
            });
            throw error;
        }
    }

    async searchPropertiesSimple(
        query: string,
        metadata: Partial<LandSearchParams> = {},
        limit: number = DEFAULT_MATCH_COUNT
    ): Promise<LandPlotMemory[]> {
        try {

            console.log('Search query:', query);
            const embedding = await this.embedder.embedText(query);

            console.log('Search query embedding:', embedding);

            const results = await this.database.searchLandByEmbedding(
                embedding,
                metadata
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

    /**
     * Search for properties using natural language query and metadata filters
     */
    async searchProperties(
        query: string,
        metadata: Partial<LandSearchParams> = {},
        limit: number = DEFAULT_MATCH_COUNT
    ): Promise<LandPlotMemory[]> {
        try {

            //console.log('Search query:', query);
            const embedding = await this.embedder.embedText(query);

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

    /**
     * Creates a land memory and its fragments from a knowledge item
     */
    async setLandKnowledge(
        item: LandKnowledgeItem,
        chunkSize: number = 512,
        bleed: number = 20
    ): Promise<UUID> {
        try {
            // First create the main land memory
            const mainMemory: LandPlotMemory = {
                id: item.id,
                userId: LAND_AGENT_ID,
                agentId: LAND_AGENT_ID,
                roomId: LAND_ROOM_ID,
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

    async getLandKnowledgeById(id: UUID): Promise<LandKnowledgeItem | undefined> {
        const memory = await this.database.getLandMemoryById(id);
        if (!memory) return undefined;

        return {
            id: memory.id,
            content: memory.content,
 //           text: memory.text,
  //          metadata: memory.metadata
        };
    }
}
