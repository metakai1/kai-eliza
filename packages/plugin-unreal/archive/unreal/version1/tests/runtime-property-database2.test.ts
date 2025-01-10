import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { LandDatabaseAdapter } from "../land_database_adapter";
import { LandMemorySystem } from "../land_memory_system";
import {
    LandPlotMemory,
    LandPlotMetadata,
    ZoningType,
    PlotSize,
    BuildingType,
    DistanceCategory,
    LAND_TABLE,
    LAND_ROOM_ID,
    LAND_AGENT_ID,
    LandSearchParams,
    LandKnowledgeItem
} from "../types";
import { stringToUuid, ModelProviderName, MemoryManager, embed } from "@ai16z/eliza";
import { printLandMemory } from "../logging";

describe('Land Plot Database Operations', () => {
    let runtime: any;
    let db: LandDatabaseAdapter;
    let memorySystem: LandMemorySystem;
    let idCounter = 0;
    const generateUniqueId = (prefix: string) => {
        idCounter++;
        return stringToUuid(`${prefix}-${idCounter}`);
    };

    beforeAll(async () => {
        // Initialize database
        db = new LandDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/test',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        await db.init();

        // Create runtime with real database adapter
        runtime = {
            agentId: LAND_AGENT_ID,
            serverUrl: 'http://localhost:3000',
            databaseAdapter: db,
            token: process.env.OPENAI_API_KEY,
            modelProvider: 'openai' as ModelProviderName,
            character: {
                modelProvider: 'openai',
                modelEndpointOverride: process.env.OPENAI_API_ENDPOINT,
            },
            messageManager: {
                getCachedEmbeddings: async () => [],
            },
            memoryManager: new MemoryManager({ tableName: 'memories', runtime }),
            documentsManager: new MemoryManager({ tableName: 'documents', runtime }),
            knowledgeManager: new MemoryManager({ tableName: 'knowledge', runtime }),
            getCachedEmbeddings: async () => {
                // Return a properly sized embedding array
                return new Float32Array(1536).fill(0.1);
            },
        };

        const embedder = {
            embedText: async (text: string) => embed(runtime, text)
        };

        // Initialize memory system with real embedder
        memorySystem = new LandMemorySystem(db, embedder);

        // Clear any existing data before all tests
        await db.removeAllLandMemories(LAND_ROOM_ID);
    });

    beforeEach(async () => {
        // Reset ID counter
        idCounter = 0;
        // Clear database
        //await db.removeAllLandMemories(LAND_ROOM_ID);
    });

    afterEach(async () => {
        // Clean up after each test
        //await db.removeAllLandMemories(LAND_ROOM_ID);
    });

    afterAll(async () => {
        await db.removeAllLandMemories(LAND_ROOM_ID);
        await db.close();
    });


    const getTestLandMetadata = () => {
        return {
            name: 'Oceanview Residence',
            neighborhood: 'Coastal District',
            zoning: ZoningType.Residential,
            plotSize: PlotSize.Large,
            buildingType: BuildingType.MidRise,
        };
    };


    const getTestLandKnowledgeItem = (text: string, metadata: any): LandKnowledgeItem => {
        return {
            id: generateUniqueId('knowledge'),
            content: {
                text: text,
                metadata: metadata
            }
        };
    };

    describe('Land Knowledge Operations', () => {
        test('should store and retrieve land knowledge by id', async () => {
            const testText = "This is a test land knowledge entry";
            const testMetadata = { type: "test" };

            const knowledgeItem: LandKnowledgeItem = getTestLandKnowledgeItem(testText, testMetadata);

            // Store the knowledge and get the ID
            const knowledgeId = await memorySystem.setLandKnowledge(knowledgeItem);
            expect(knowledgeId).toBeDefined();

            // Retrieve the knowledge by ID
            const retrievedKnowledge = await memorySystem.getLandKnowledgeById(knowledgeId);
            expect(retrievedKnowledge).toBeDefined();
            expect(retrievedKnowledge?.content.text).toBe(testText);
            expect(retrievedKnowledge?.content.metadata).toEqual(testMetadata);
        });
    });

    describe('Land Plot Creation', () => {
        test('should create valid land plot memory', async () => {
            const testMetadata: LandPlotMetadata = {
                name: 'Oceanview Residence',
                neighborhood: 'Coastal District',
                zoning: ZoningType.Residential,
                plotSize: PlotSize.Large,
                buildingType: BuildingType.MidRise,
                distances: {
                    ocean: { meters: 150, category: DistanceCategory.Close },
                    bay: { meters: 2000, category: DistanceCategory.Far }
                },
                building: {
                    floors: { min: 5, max: 8 },
                    height: { min: 15, max: 24 }
                },
                plotArea: 2500,
                rank: 1
            };

            const knowledgeItem = {
                id: generateUniqueId(LAND_AGENT_ID),
                content: {
                    text: `${testMetadata.name} is a ${testMetadata.plotSize} ${testMetadata.zoning} plot in ${testMetadata.neighborhood}. ` +
                          `It is located ${testMetadata.distances.ocean.meters}m from the ocean and ${testMetadata.distances.bay.meters}m from the bay. ` +
                          `The building can have between ${testMetadata.building.floors.min} and ${testMetadata.building.floors.max} floors.`,
                    metadata: testMetadata
                },
                roomId: LAND_ROOM_ID,
                agentId: LAND_AGENT_ID,
                type: 'land_plot'
            };

            await memorySystem.setLandKnowledge(knowledgeItem);

            // Verify creation by searching for the property
            const results = await memorySystem.searchPropertiesSimple(knowledgeItem.content.text);
            expect(results.length).toBeGreaterThan(0);

            const result = results[0];
            expect(result.content.metadata.name).toBe(testMetadata.name);
            expect(result.content.metadata.plotSize).toBe(testMetadata.plotSize);
            expect(result.content.metadata.zoning).toBe(testMetadata.zoning);
        }, 10000);
    });


    describe('Land Plot Search', () => {
        test('should find plots by neighborhood', async () => {
            const searchParams = {
                neighborhoods: ['Coastal District']
            };

            const results = await db.searchLandByMetadata(searchParams);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].content.metadata.neighborhood).toBe('Coastal District');
        });

        test('should find plots by multiple metatdata', async () => {
            const searchParams = {
                neighborhoods: ['Coastal District'],
                plotSizes: [PlotSize.Large],
                //distances: {
                //    ocean: {
                //        maxMeters: 200,
                //        category: DistanceCategory.Close
                //    }
                //}
            };

            const results = await db.searchLandByMetadata(searchParams);

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.content.metadata.neighborhood).toBe('Coastal District');
                expect(result.content.metadata.plotSize).toBe(PlotSize.Large);
                //expect(result.content.metadata.distances.ocean.meters).toBeLessThanOrEqual(200);
            });
        });

        test('should find plots by semantic search', async () => {
            const testMetadata = getTestLandMetadata();

            const query = `${testMetadata.name} is a ${testMetadata.plotSize} ${testMetadata.zoning} plot in ${testMetadata.neighborhood}. `

            const testMetadataParams: Partial<LandSearchParams> = {
                neighborhoods: [testMetadata.neighborhood],
                zoningTypes: [testMetadata.zoning],
                plotSizes: [testMetadata.plotSize],
                buildingTypes: [testMetadata.buildingType]
            };

            console.log('Query:', query);
            console.log('Metadata Params:', testMetadataParams);

            const results = await memorySystem.searchProperties(query,testMetadataParams);

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.content.metadata.plotSize).toBe(PlotSize.Large);
                expect(result.content.metadata.zoning).toBe(ZoningType.Residential);
                expect(result.content.metadata.distances.ocean.category).toBe(DistanceCategory.Close);
            });
        });
    });




});