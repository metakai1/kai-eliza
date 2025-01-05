import { IAgentRuntime, Memory, State, Action } from "@ai16z/eliza";
import { PropertySearchManager } from "./searchManager";

export const startPropertySearch: Action = {
    name: "START_PROPERTY_SEARCH",
    description: "Initiates a property search session",
    similes: ["SEARCH_PROPERTIES", "FIND_PROPERTIES", "LOOK_FOR_PROPERTIES"],
    examples: [],
    handler: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const searchManager = new PropertySearchManager(runtime);

        // Initialize search session
        // TODO:add username to sear session

        await searchManager.createSearchSession(message.userId, {
            status: "ACTIVE",
            lastQuery: null,
            results: [],
            filters: {}
        });

        return "I'm ready to help you search for properties. What kind of property are you looking for?";
    },
    // create a validator here the
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        return true;
    }
}