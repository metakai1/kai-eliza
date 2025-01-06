import { Action, IAgentRuntime, Memory, State,
    ModelClass,
    composeContext,
    generateObject,
    HandlerCallback
} from "@ai16z/eliza";

import { PropertySearchManager } from "./searchManager";
//import { generateObjectV2 } from "@ai16z/eliza";
import { LAND_QUERY_SYSTEM_PROMPT } from "./database/land_memory_system";
import { LandPlotMemory, SearchMetadataSchema } from "./types";
import { z } from "zod";

export const processPropertySearch: Action = {
    name: "PROCESS_PROPERTY_SEARCH",
    similes: ["PROCESS_PROPERTY_SEARCH"],
    description: "Processes a property search and returns results",
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "give me all properties in space mind with a view of the ocean",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Searching for space mind properties:",
                    action: "PROCESS_PROPERTY_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are all legendary plots close to the bay",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Searching for legendary plots close to the bay:",
                    action: "PROCESS_PROPERTY_SEARCH",
                },
            },
        ],
    ],
    handler: async (runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options: any,
        callback: HandlerCallback
    ) => {
        if (!state) {
            throw new Error('State is required for property search processing');
        }

        const searchManager = new PropertySearchManager(runtime);


        const TEST_LAND_QUERY_SYSTEM_PROMPT = `
You are helping to test a memory retrieval system. For test purposes,
Please generate this specific JSON response for the query given.
Only respond with the JSON response. You should insert the original USER PROMPT
into the JSON reponse in USERPROMPT.  for the metadata, just
use the values provided below.  In this way we test the memory retrieval system.
HERE IS THE JSON RESPONSE template below.  Only respond with the JSON reponse.
{
    "searchText": "USERPROMPT",
    "metadata": {
        "neighborhood": ["Flashing Lights"],
        "distances": {
            "ocean": {
                "maxMeters": 300,
                "category": "Close"
            },
            "bay": {
                "maxMeters": 500,
                "category": "Medium"
            }
        }
    }
}
USER PROMPT:
give me all properties in space mind
`
        const context = composeContext({
            state,
            template: TEST_LAND_QUERY_SYSTEM_PROMPT,
        });

        console.log("Composed context:", context);

        const metadataResult = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: z.object({
                searchText: z.string(),
                metadata: z.object({
                    neighborhood: z.array(z.string()),
                    distances: z.object({
                        ocean: z.object({
                            maxMeters: z.number(),
                            category: z.enum(["Close", "Medium", "Far"])
                        }),
                        bay: z.object({
                            maxMeters: z.number(),
                            category: z.enum(["Close", "Medium", "Far"])
                        })
                    })
                })
            })
        });

        if (!metadataResult?.object) {
            throw new Error('Failed to generate search metadata');
        }

        console.log("Generated search metadata object: ", metadataResult.object);
        // Validate search metadata using Zod schema
        // const validatedMetadata = SearchMetadataSchema.parse(metadataResult);

        // Execute search
        const results = await searchManager.executeSearch(metadataResult.object);

        if (!!results) {
            await searchManager.updateSearchResults(message.userId, results);
        };

        console.log("Search results:", results);

        // Format response
        const formattedResponse = formatSearchResults(results);

        console.log("Formatted response:", formattedResponse);

        callback({
            text: formattedResponse
        });

        return true;
    },
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const searchManager = new PropertySearchManager(runtime);
        const session = await searchManager.getSearchSession(message.userId);
        return !!session && session.status === "ACTIVE";
    }
};

function formatSearchResults(landMemories: LandPlotMemory[]): string {
    if (landMemories.length === 0) {
        return "I couldn't find any properties matching your criteria. Would you like to try a different search?";
    }

    let response = `I found ${landMemories.length} properties matching your criteria:\n\n`;
    landMemories.forEach(property => {
        const metadata = property.content.metadata;
        response += `${metadata.name} in ${metadata.neighborhood}:\n`;
        response += `- ${metadata.buildingType} ${metadata.zoning} building\n`;
        response += `- Plot size: ${metadata.plotSize} (${metadata.plotArea}m²)\n`;
        response += `- Floors: ${metadata.building.floors.min}-${metadata.building.floors.max}\n`;
        response += `- Ocean: ${metadata.distances.ocean.meters}m (${metadata.distances.ocean.category})\n`;
        response += `- Bay: ${metadata.distances.bay.meters}m (${metadata.distances.bay.category})\n\n`;
    });

    return response;
}

        // Generate search metadata using LLM
/*          const searchMetadata = (await generateObjectV2({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: SearchMetadataSchema,
        })) as z.infer<typeof SearchMetadataSchema>; */

