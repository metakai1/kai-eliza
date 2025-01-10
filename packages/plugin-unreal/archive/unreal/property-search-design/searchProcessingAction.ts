import { Action, IAgentRuntime, Memory, State,
    ModelClass,
    composeContext,
} from "@ai16z/eliza";

import { PropertySearchManager } from "./searchManager";
import { generateObjectV2 } from "@ai16z/eliza";
import { LAND_QUERY_SYSTEM_PROMPT } from "./land_memory_system";
import { LandPlotMemory, SearchMetadataSchema } from "./types";
import { Z } from "vitest/dist/chunks/reporters.D7Jzd9GS.js";
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
    handler: async (runtime: IAgentRuntime, message: Memory, state: State | undefined) => {
        if (!state) {
            throw new Error('State is required for property search processing');
        }
        const searchManager = new PropertySearchManager(runtime);

        const TEST_LAND_QUERY_SYSTEM_PROMPT = `
You are helping to test a memory retrieval system. For test purposes,
Please generate this specific JSON response for the query given.
Only respond with the JSON response. You should insert the original USER PROMPT
into the JSON reponse in {user supplied query}.  for the metadata, just
use the values provided below.  In this way we test the memory retrieval system.
HERE IS THE JSON RESPONSE template below.  Only responsd with the JSON reponse.
{
    "searchText": "{user supplied query}",
    "metadata": {
        "neighborhood": ["Flashing Lights"],
        "maxDistance": {
            "ocean": 300,
            "bay": null
        }
    }
}
USER PROMPT:
{{currentMessage}}
`
        const context = composeContext({
            state,
            template: LAND_QUERY_SYSTEM_PROMPT,
        });

        console.log("Generated context:", context);

        // Generate search metadata using LLM
/*         const searchMetadata = (await generateObjectV2({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: SearchMetadataSchema,
        })) as z.infer<typeof SearchMetadataSchema>;
 */

        const searchMetadata = {
            searchText: message.content.text,
            metadata: {
                neighborhood: ["Flashing Lights"],
                maxDistance: {
                    ocean: 300,
                    bay: null
                }
            }
        }

        console.log("Generated search metadata:", searchMetadata);

        // Execute search
        const results = await searchManager.executeSearch(searchMetadata);

        console.log("Search results:", results);

        // Store results in session
        await searchManager.updateSearchResults(message.userId, results);

        // Format response
        return formatSearchResults(results);
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