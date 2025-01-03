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
    LAND_AGENT_ID
} from "../types";
import { stringToUuid, ModelProviderName, MemoryManager, embed } from "@ai16z/eliza";
import { printLandMemory } from "../logging";

describe('Land Plot Database Operations', () => {
    let runtime: any;
    let db: LandDatabaseAdapter;
    let memorySystem: LandMemorySystem;

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
                return new Float32Array(1536).fill(0);
            },
        };

        const embedder = {
            embedText: async (text: string) => embed(runtime, text)
        };

        // Initialize memory system with real embedder
        memorySystem = new LandMemorySystem(db, embedder);
    });

    afterAll(async () => {
        await db.close();
    });

    describe('Land Plot Creation', () => {
        test('should create valid land plot memory', async () => {
            const testMetadata: LandPlotMetadata = {
                rank: 1,
                name: 'Oceanview Residence',
                neighborhood: 'Coastal District',
                zoning: ZoningType.Residential,
                plotSize: PlotSize.Large,
                buildingType: BuildingType.MidRise,
                distances: {
                    ocean: {
                        meters: 150,
                        category: DistanceCategory.Close
                    },
                    bay: {
                        meters: 2000,
                        category: DistanceCategory.Far
                    }
                },
                building: {
                    floors: { min: 5, max: 8 },
                    height: { min: 15, max: 24 }
                },
                plotArea: 2500
            };

            const knowledgeItem = {
                id: stringToUuid(`LAND_AGENT_ID-${Date.now()}`),
                content: {
                    text: `${testMetadata.name} is a ${testMetadata.plotSize} ${testMetadata.zoning} plot in ${testMetadata.neighborhood}. ` +
                         `It is located ${testMetadata.distances.ocean.meters}m from the ocean and ${testMetadata.distances.bay.meters}m from the bay. ` +
                         `The building can have between ${testMetadata.building.floors.min} and ${testMetadata.building.floors.max} floors, ` +
                         `with a height between ${testMetadata.building.height.min}m and ${testMetadata.building.height.max}m.`,
                    metadata: testMetadata
                }
            };

            await memorySystem.setLandKnowledge(knowledgeItem);

            // Verify creation by searching for the property
            const results = await memorySystem.searchProperties(testMetadata.name);
            expect(results.length).toBeGreaterThan(0);

            const result = results[0];
            printLandMemory(result);

            expect(result).toBeDefined();
            expect(result.content.metadata.name).toBe('Oceanview Residence');
            expect(result.content.metadata.plotSize).toBe(PlotSize.Large);
            expect(result.content.source).toBe(knowledgeItem.id);
        });
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

        test('should find plots by combined criteria', async () => {
            const searchParams = {
                neighborhoods: ['Coastal District'],
                plotSizes: [PlotSize.Large],
                distances: {
                    ocean: {
                        maxMeters: 200,
                        category: DistanceCategory.Close
                    }
                }
            };

            const results = await db.searchLandByMetadata(searchParams);

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.content.metadata.neighborhood).toBe('Coastal District');
                expect(result.content.metadata.plotSize).toBe(PlotSize.Large);
                expect(result.content.metadata.distances.ocean.meters).toBeLessThanOrEqual(200);
            });
        });

        test('should find plots by semantic search', async () => {
            const query = "Large residential plot near the ocean";
            const results = await memorySystem.searchProperties(query);

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.content.metadata.plotSize).toBe(PlotSize.Large);
                expect(result.content.metadata.zoning).toBe(ZoningType.Residential);
                expect(result.content.metadata.distances.ocean.category).toBe(DistanceCategory.Close);
            });
        });
    });

});
