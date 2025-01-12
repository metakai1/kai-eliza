import { Action, IAgentRuntime, Memory, State,
    ModelClass,
    composeContext,
    generateObject,
    generateText,
    HandlerCallback,
    formatEvaluatorExampleDescriptions
} from "@ai16z/eliza";
import * as fs from "fs";
import * as path from "path";
import util from 'util';

import { PropertySearchManager } from "./searchManager";
//import { generateObjectV2 } from "@ai16z/eliza";
import { LAND_QUERY_SYSTEM_PROMPT } from "./database/land_memory_system";
import { LandPlotMemory, SearchMetadataSchema, QueryExtractionSchema, OrderByParameter } from "./types";
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
        const queryPromptFile = path.join(promptDir, 'query_extraction_promptV3.txt');

        const searchManager = new PropertySearchManager(runtime);

        logMessageContent(message);

        callback({
            text: 'Processing query...'
        });

        const QUERY_EXTRACTION_SYSTEM_PROMPT = fs.readFileSync(
            queryPromptFile,
            'utf-8'
        );

        const recentMessages = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 10,
        });

        // deprecated: iterate through recentMessages and filter out very long messages
        const filteredRecentMessages = recentMessages.filter((msg) =>
            msg.content.text.length <= 1000);

        //console.log("Filtered recent messages:", filteredRecentMessages);

        // filter out messages that are not from this userID
        const filteredRecentMessagesFromUser = filteredRecentMessages.filter((msg) =>
            msg.userId === message.userId
        );

        // for each filteredRecentMessagesFromUser, call logMessageContent
        filteredRecentMessagesFromUser.forEach((msg) => {
            logMessageText(msg);
        })

        const context = composeContext({
            state: {
                ...state,
                thisMessage: message.content.text,
                recentMessagesData: filteredRecentMessagesFromUser
            },
            template: QUERY_EXTRACTION_SYSTEM_PROMPT,
            templatingEngine: "handlebars",
        });

        //console.log("Query extraction context:", context);

        const queryExtraction = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
            schema: QueryExtractionSchema,
        });

        if (!queryExtraction?.object) {
            throw new Error('Failed to generate query extraction');
        }


        const queryObject = queryExtraction.object as z.infer<typeof QueryExtractionSchema>;
        const landSearchQuery =  queryObject.searchQuery;

        console.log("Generated query extraction Object:", queryObject);

        callback({
            text: 'Asking ATLAS: ' + landSearchQuery
        });

        const FILE_LAND_QUERY_SYSTEM_PROMPT = fs.readFileSync(
            landPromptFile,
            'utf-8'
        );

        const landQueryContext = FILE_LAND_QUERY_SYSTEM_PROMPT + landSearchQuery;

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

        // Execute search using V2
        const results = await searchManager.executeSearchV2(metadataResult.object, queryExtraction.object);

        if (results.length === 0) {
            callback({
                text: 'Right now there are no properties matching your criteria, would you like to try a different search?'
            })
            return true;
            //throw new Error('No search results returned');
        }

        if (results.length > 0) {
            await searchManager.updateSearchResults(message.userId, results);
        }

        // log the names of the properties in results.content.metadata.name
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

    let response = `I found ${landMemories.length} properties matching your criteria: (up to 17 shown)\n\n`;

    landMemories.slice(0, 17).forEach(property => {
        const metadata = property.content.metadata;
        const nftData = metadata.nftData;

        response += `${metadata.name} in ${metadata.neighborhood}: ${metadata.zoning} `;
        if (nftData?.price) {
            response += `💎 Price: ${nftData.price} ETH`;
        }
        response += ` Rank ${metadata.rank} `;
        response += '\n';
        response += `- Plot size: ${metadata.plotSize} (${metadata.plotArea}m²)  ${metadata.buildingType} `;
        response += `  |  Floors: ${metadata.building.floors.min}-${metadata.building.floors.max}`;
        response += `  |  Distance To Ocean: ${metadata.distances.ocean.meters}m (${metadata.distances.ocean.category}) `;
        response += ` To Bay: ${metadata.distances.bay.meters}m (${metadata.distances.bay.category})\n\n`;
    });
    return response;
}


// Function to pretty print message content with proper indentation and formatting
function logMessageContent(message: Memory) {
    console.log('\n==== Message Details ====');
    console.log('ID:', message.id);
    console.log('User ID:', message.userId);
    console.log('\n=== Message Content ===');
    if (message.content) {
        const prettyContent = util.inspect(message.content, {
            colors: true,
            depth: null,
            maxArrayLength: null,
            compact: false,
            breakLength: 80
        });
        console.log(prettyContent);
    } else {
        console.log('No content available');
    }

    console.log('==== End Message Details ====\n');
}

function logMessageText(message: Memory) {
    console.log('=== Message Text: ', message.content.text, ' ===');
}