import { elizaLogger, UUID, stringToUuid, splitChunks } from "@ai16z/eliza";
import { LandPlotMemory,
    LandSearchParams,
    DEFAULT_MATCH_COUNT,
    LandKnowledgeItem,
    LandPlotMetadata,
    ZoningType,
    PlotSize,
    BuildingType,
    DistanceCategory,
    LAND_TABLE
} from "../types";
import { LAND_ROOM_ID, LAND_AGENT_ID, AGENT_ID } from "../types";
import { v4 as uuidv4 } from 'uuid';
import { ILandDataProvider } from '../interfaces/ILandDataProvider';

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
    private readonly roomId: UUID = LAND_ROOM_ID;
    private readonly agentId: UUID = LAND_AGENT_ID;
    private readonly userId: UUID = AGENT_ID;

    constructor(
        private readonly dataProvider: ILandDataProvider,
    ) {}

    async removeAllLandMemories(): Promise<void> {
        await this.dataProvider.removeAllLandMemories(this.roomId);
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

    async searchPropertiesByParams(searchParams: Partial<LandSearchParams> = {}): Promise<LandPlotMemory[]> {
        const results = await this.dataProvider.searchLandByMetadata(searchParams);
        return results;
    }

    async mockSearchPropertiesByParams(searchParams: Partial<LandSearchParams> = {}): Promise<LandPlotMemory[]> {
        const mockProperty: LandPlotMemory = {
            id: '94e9f251-1ec7-0bde-b9cc-0fffa695eebf',
            content: {
                text: 'Oceanview Residence is a Large Residential plot in Coastal District. It is located 150m from the ocean and 2000m from the bay. The building can have between 5 and 8 floors, with heights from 15m to 24m. The plot area is 2500m².',
                metadata: {
                    name: 'Oceanview Residence',
                    rank: 1,
                    zoning: ZoningType.Residential,
                    building: {
                        floors: { max: 8, min: 5 },
                        height: { max: 24, min: 15 }
                    },
                    plotArea: 2500,
                    plotSize: PlotSize.Macro, //'Large',
                    distances: {
                        bay: { meters: 2000, category: DistanceCategory.Far },
                        ocean: { meters: 150, category: DistanceCategory.Close }
                    },
                    buildingType: BuildingType.Midrise, //'MidRise',
                    neighborhood: 'Coastal District'
                }
            },
            userId: '1459b245-2171-02f6-b436-c3c2641848e5',
            agentId: '1459b245-2171-02f6-b436-c3c2641848e5',
            roomId: '1459b245-2171-02f6-b436-c3c2641848e5',
            unique: true
        };

        return [mockProperty];
    }

    /**
     * Get properties within a specific rarity range
     */
/*     async getPropertiesByRarity(
        minRank: number,
        maxRank: number,
        limit: number = DEFAULT_MATCH_COUNT
    ): Promise<LandPlotMemory[]> {
        try {
            const results = await this.dataProvider.getPropertiesByRarityRange(minRank, maxRank);
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
 */
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
            await this.dataProvider.createLandMemory(mainMemory);
            return item.id;
        } catch (error) {
            elizaLogger.error('Error setting land knowledge:', {
                error: error instanceof Error ? error.message : String(error),
                item
            });
            throw error;
        }
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