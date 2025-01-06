import { IAgentRuntime, Memory, State, Action, elizaLogger, HandlerCallback } from "@ai16z/eliza";
import { PropertySearchManager } from "./searchManager";

export const startPropertySearch: Action = {
    name: "START_PROPERTY_SEARCH",
    description: "Initiates a property search session for wilder world land properties",
    similes: ["SEARCH_PROPERTIES", "FIND_PROPERTIES", "LOOK_FOR_PROPERTIES"],
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I'd like to look for wilder world land properties",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "sure I'll get your search session started. What kind of property are you looking for?",
                    action: "START_PROPERTY_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Help me to search for Wilder World Land.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll get your search session started.  What are you looking for?",
                    action: "START_PROPERTY_SEARCH",
                },
            },
        ],
    ],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
            const searchManager = new PropertySearchManager(runtime);

            // Initialize search session
            await searchManager.createSearchSession(message.userId, {
                status: "ACTIVE",
                lastQuery: null,
                results: [],
                filters: {}
            });

            const responseMsg = {
                text: `I'm ready to help you search for properties. What kind of property
                are you looking for? Currently Space mind is the only neighborhood available.`,
                //content: {
                //    action: "START_PROPERTY_SEARCH",
                //}
            };


            callback(responseMsg);

            return true;
    },
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            const searchManager = new PropertySearchManager(runtime);
            const userId = message.userId;

            // check if an active search session exists for the user
            const activeSearchSession = await searchManager.getSearchSession(userId);

            if (activeSearchSession) {
                elizaLogger.info("An active search session already exists for the user.");
                return false;
            }

            return true;
        } catch (error) {
            elizaLogger.error("Failed to validate property search:", error);
            return false;
        }
    }
}