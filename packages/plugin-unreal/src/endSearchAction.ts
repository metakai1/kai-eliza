import { IAgentRuntime, Memory, State, Action, elizaLogger, HandlerCallback } from "@ai16z/eliza";
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
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: any,
        callback?: HandlerCallback
    ) => {
        const searchManager = new PropertySearchManager(runtime);
        await searchManager.endSearchSession(message.userId);

        callback({
            text: "Wilder World property Search session ended."
        });
        return true;
    },
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const searchManager = new PropertySearchManager(runtime);
        const session = await searchManager.getSearchSession(message.userId);

        // Only allow ending active sessions
        if (!session || session.status !== "ACTIVE") {
            return false;
        }
        console.log("VALIDATE endPropertySearch validated");
        return true;
    },
};