
import { elizaLogger, generateText } from "@ai16z/eliza";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
} from "@ai16z/eliza";

import fs from "fs";
import path from "path";

export const unrealAgentAction: Action = {
    name: "GET_PROPERTIES",
    similes: [
        "SEARCH_PROPERTIES",
        "SEARCH_FOR_PROPERTIES",
        "FIND_PROPERTIES",
        "FIND_PROPERTY",
    ],
    description: "Begins a chat session for finding wilder world properties.",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.info("Unreal Agent: recent state messages", state.recentMessages);

        //elizaLogger.log("Composing state for message:", message.content.text);

        state = (await runtime.composeState(message)) as State;

        //console.log("state: ", state);

        const userId = runtime.agentId;
        elizaLogger.log("User ID:", userId);

        const searchPrompt = message.content.text;

        elizaLogger.log("Search prompt received:", searchPrompt);



        const sometext = await generateText( {
            runtime,
            context: searchPrompt,
            modelClass: "small"
        });

        if (sometext) {
            elizaLogger.log("Generated text:", sometext);

            callback({
                text: "I found these properties: " + sometext
            })
        } else {
            elizaLogger.error("No response from generateText");
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "search wilder world properties for Spacemind Tower" },
            },
            {
                user: "ATLAS",
                content: {
                    text: "Here are the properties for Spacemind Tower:",
                    action: "GET_PROPERTIES",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "search wilder land for the properties in Flashing Lights" },
            },
            {
                user: "ATLAS",
                content: {
                    text: "In Flashing Lights, here are the properties:",
                    action: "GET_PROPERTIES",
                },
            },
        ],
   ],
} as Action;
