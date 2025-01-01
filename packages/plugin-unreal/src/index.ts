import { Plugin } from "@ai16z/eliza";
import { continueAction } from "./actions.ts";
import { factEvaluator } from "./evaluators.ts";
import { factsProvider } from "./providers.ts";

export * as actions from "./actions.ts";
export * as evaluators from "./evaluators.ts";
export * as providers from "./providers.ts";

import { AgentRuntime, knowledge, stringToUuid, generateText, settings, Action, elizaLogger, MemoryManager, EvaluationExample, Content } from "@ai16z/eliza";
import type { KnowledgeItem } from "@ai16z/eliza";

import {
    Evaluator,
    IAgentRuntime,
    Memory,
    State,
    Provider,
    HandlerCallback,
} from "@ai16z/eliza";

const saveThisAction: Action = {
    name: "SAVE_THIS",
    description: "Stores important information from the conversation in the agent's long-term knowledge base",
    similes: [],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return Promise.resolve(!!message?.content?.text);
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        try {

            if (!state) {
                elizaLogger.error("[SaveThisAction] handler.start - no state");
                return state;
            }

            // Only proceed if explicitly requested via state
            if (!state?.shouldSave) {
                elizaLogger.info('[SaveThisAction] handler.abort - Save not requested in state');
                return state; // Important: Return the unchanged state
            }
            // Get recent messages
            const recentMessages = await runtime.messageManager.getMemories({
                roomId: message.roomId,
                count: 7,
                unique: false
            });

            // combine the text from recent messages into a string
            const recentMessagesText = recentMessages
                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
                .map(msg => msg.content.text)
                .join("\n\n");

            elizaLogger.info("Recent messages:", recentMessagesText);

            const saveKnowledge = await generateText({
                runtime,
                context: `\
The following messages are from a conversation between an ai agent and a user.
responses by the agent, retaining style and tone. Save the memory as a paragraph of text, not in point
or bullet form. Here are the messages:
${recentMessagesText}`,
                modelClass: "medium"
            });

            // Save the message content to the knowledge base
            const memoryToSave = {
                id: stringToUuid(`memory_${Date.now()}`),
                content: {
                    text: saveKnowledge,
                    source: "agentdata"
                }
            };

            //elizaLogger.info("Memory to save:", memoryToSave);

            await knowledge.set(runtime as AgentRuntime, memoryToSave);

            // TODO: callback is undefined.  Need to receive callback from Provider.
            if (callback) {
                await callback({
                    text: `I've stored the information for you`,
                    type: "text"
                }, []);
            }

        } catch (error) {
            elizaLogger.error('[Action] handler.error:', error);
            if (callback) {
                await callback({
                    text: "Sorry, I encountered an error while saving.",
                    content: {
                        success: false,
                        text: "Sorry, I encountered an error while saving."
                    }
                }, []);
            }
            return false;
        }
    },
    examples: []
};

export const saveThisProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory,
        state?: State, callback?: HandlerCallback ) => {
        const text = message.content?.text?.toLowerCase() || '';

        // Trigger if message starts with "save this"
        if (text.trim().startsWith('save this')) {
            // Modify state in place first
            if (state) {
                state.shouldSave = true;
            }

            if(!state.shouldSave) {
                elizaLogger.error('saveThisProvider: state.shouldSave is faised');
            }

            //elizaLogger.info(state.recentMessages);
            elizaLogger.info("saveThisProvider: state.shouldSave", state.shouldSave);

            // need to figure out how to pass a callback into runtime.processActions
            //const mycallback = async (response: Content, files?: Memory[]): Promise<Memory[]> => {
                // to be implemented
            //};

            // Then trigger the SAVE_THIS action
            await runtime.processActions(message, [{
                id: stringToUuid(`save_this_response_${Date.now()}`),
                userId: message.userId,
                agentId: message.agentId,
                roomId: message.roomId,
                content: {
                    action: 'SAVE_THIS',
                    text: 'Saving previous message...'
                },

            }], state=state,
                //callback=mycallback  figure out what this should be
        );
        }

        return;
    }
};


export const saveThisPlugin: Plugin = {
    name: "save-this",
    description: "Plugin for saving important information from conversations using a save this keyphrase",
    actions: [saveThisAction],
    evaluators: [],
    providers: [saveThisProvider]
};


export const unrealPlugin: Plugin = {
    name: "unreal",
    description: "Unreal Agent with basic actions and evaluators",
    actions: [continueAction],
    evaluators: [factEvaluator],
    providers: [factsProvider],
};
