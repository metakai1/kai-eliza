import { IAgentRuntime, Memory, State, Action, elizaLogger } from "@ai16z/eliza";
import { PropertySearchManager } from "./searchManager";

export const endPropertySearch: Action = {
    name: "END_PROPERTY_SEARCH",
    description: "Ends the current property search session",
    similes: ["STOP_SEARCH", "END_SEARCH", "FINISH_SEARCH", "CANCEL_SEARCH"],
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I'm done searching for properties",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I've ended your property search session. Let me know if you'd like to start a new search!",
                    action: "END_PROPERTY_SEARCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "End my property search",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I've cancelled your property search session. Feel free to start a new search anytime!",
                    action: "END_PROPERTY_SEARCH",
                },
            },
        ],
    ],
    handler: async (runtime: IAgentRuntime, message: Memory, state: State | undefined) => {
        if (!state) {
            throw new Error('State is required for ending property search');
        }

        const searchManager = new PropertySearchManager(runtime);
        const session = await searchManager.getSearchSession(message.userId);

        if (!session || session.status === "INACTIVE") {
            return "You don't have an active property search session.";
        }

        // End the session by creating a new inactive session
        await searchManager.createSearchSession(message.userId, {
            status: "INACTIVE",
            lastQuery: null,
            results: [],
            filters: {}
        });

        return "I've ended your property search session. Let me know if you'd like to start a new search!";
    },
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const searchManager = new PropertySearchManager(runtime);
        const session = await searchManager.getSearchSession(message.userId);

        if (!session || session.status === "INACTIVE") {
            return false;
        }

        return true;
    }
};