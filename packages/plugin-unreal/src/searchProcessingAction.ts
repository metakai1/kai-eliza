import { Action, IAgentRuntime, Memory, State,
    ModelClass,
    composeContext,
    generateObject,
    generateText,
    HandlerCallback
} from "@ai16z/eliza";
import * as fs from "fs";
import * as path from "path";

import { PropertySearchManager } from "./searchManager";
//import { generateObjectV2 } from "@ai16z/eliza";
import { LAND_QUERY_SYSTEM_PROMPT } from "./database/land_memory_system";
import { LandPlotMemory, SearchMetadataSchema } from "./types";
import { z } from "zod";

export const processPropertySearch: Action = {
    name: "PROCESS_PROPERTY_SEARCH",
    similes: ["SEARCH_WILDER_LAND","LAND_SEARCH"],
    description: "Processes a wilder world land property search in the land memory database and returns results",
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
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How does the plot size of FL-45 compare to other residential properties in Flashing Lights?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Analyzing plot size comparison in Flashing Lights:",
                    action: "PROCESS_PROPERTY_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How many plots in Tranquility Gardens are close to the Ocean?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Searching for oceanfront plots in Tranquility Gardens:",
                    action: "PROCESS_PROPERTY_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Which SM property is closest to the Ocean?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Finding closest Space Mind property to ocean:",
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
        // read from file
        const promptDir = path.join(process.cwd(), 'prompts');
        const landPromptFile = path.join(promptDir, 'land_query_prompt.txt');
        const queryPromptFile = path.join(promptDir, 'query_extraction_prompt.txt');

        const searchManager = new PropertySearchManager(runtime);

        const QUERY_EXTRACTION_SYSTEM_PROMPT = fs.readFileSync(
            queryPromptFile,
            'utf-8'
        );

        // TODO: parse recent messages to filter out very long messages
        const recentMessages = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 6,
        });
        // iterate through recentMessages and filter out very long messages
        const filteredRecentMessages = recentMessages.filter((msg) =>
            msg.content.text.length <= 1000);

        // add filtered recent messages to context
        const context = composeContext({
            state: {
                ...state,
                recentMessagesData: filteredRecentMessages
            },
            template: QUERY_EXTRACTION_SYSTEM_PROMPT,
        });

        //console.log("Composed context:", context);

        const searchQuery = await generateText({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        console.log("Generated search query:", searchQuery);

        callback({
            text: 'Asking ATLAS: ' + searchQuery
        });

        const FILE_LAND_QUERY_SYSTEM_PROMPT = fs.readFileSync(
            landPromptFile,
            'utf-8'
        );

        const landQueryContext = FILE_LAND_QUERY_SYSTEM_PROMPT + searchQuery;

        //console.log("Land query context:", landQueryContext);

        const metadataResult = await generateObject({
            runtime,
            context: landQueryContext,
            modelClass: ModelClass.SMALL,
            schema: SearchMetadataSchema,
        });

        if (!metadataResult?.object) {
            throw new Error('Failed to generate search metadata');
        }

        console.log("Generated search metadata object: ", metadataResult.object);

        // Execute search
        const results = await searchManager.executeSearch(metadataResult.object);

        if (!!results) {
            await searchManager.updateSearchResults(message.userId, results);
        };

        // log the names of the properties in results.content.metadata.name
        // separated by a space and a comma
        console.log("Search results names:", results.map((result) => result.content.metadata.name).join(", "));

        // Format response
        const formattedResponse = formatSearchResults(results);

        callback({
            text: formattedResponse
        });

        return true;
    },
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const searchManager = new PropertySearchManager(runtime);
        const session = await searchManager.getSearchSession(message.userId);

        console.log("PROCESS_PROPERTY_SEARCH validate session status= ", session?.status);
        console.log("#results in session= ", session?.results.length);
        const isValid = !!session && session.status === "ACTIVE";
        if  (isValid) {
            console.log("VALIDATE: processPropertySearch validated");
        }
        return isValid;
    }
};

function formatSearchResults(landMemories: LandPlotMemory[]): string {
    if (landMemories.length === 0) {
        return "I couldn't find any properties matching your criteria. Would you like to try a different search?";
    }

    let response = `I found ${landMemories.length} properties matching your criteria: (first 10 shown)\n\n`;

    landMemories.slice(0, 10).forEach(property => {
        const metadata = property.content.metadata;
        response += `${metadata.name} in ${metadata.neighborhood}: ${metadata.zoning}  \n`;
        response += `- Plot size: ${metadata.plotSize} (${metadata.plotArea}m²)  ${metadata.buildingType} `;
        response += `  |  Floors: ${metadata.building.floors.min}-${metadata.building.floors.max}`;
        response += `  |  Distance To Ocean: ${metadata.distances.ocean.meters}m (${metadata.distances.ocean.category}) `;
        response += ` To Bay: ${metadata.distances.bay.meters}m (${metadata.distances.bay.category})\n\n`;
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
