import { composeContext, elizaLogger } from "@ai16z/eliza";
import { generateMessageResponse, generateTrueOrFalse } from "@ai16z/eliza";
import { booleanFooter, messageCompletionFooter } from "@ai16z/eliza";
import {
    Action,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@ai16z/eliza";

const maxContinuesInARow = 3;

export const messageHandlerTemplate =
    // {{goals}}
    `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}
{{knowledge}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter;

export const shouldContinueTemplate =
    `# Task: Decide if {{agentName}} should continue, or wait for others in the conversation so speak.

{{agentName}} is brief, and doesn't want to be annoying. {{agentName}} will only continue if the message requires a continuation to finish the thought.

Based on the following conversation, should {{agentName}} continue? YES or NO

{{recentMessages}}

Should {{agentName}} continue? ` + booleanFooter;

export const continueAction: Action = {
    name: "CONTINUE",
    similes: ["ELABORATE", "KEEP_TALKING"],
    description:
        "ONLY use this action when the message necessitates a follow up. Do not use this action when the conversation is finished or the user does not wish to speak (use IGNORE instead). If the last message action was CONTINUE, and the user has not responded. Use sparingly.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const recentMessagesData = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 10,
            unique: false,
        });
        const agentMessages = recentMessagesData.filter(
            (m: { userId: any }) => m.userId === runtime.agentId
        );

        // check if the last messages were all continues=
        if (agentMessages) {
            const lastMessages = agentMessages.slice(0, maxContinuesInARow);
            if (lastMessages.length >= maxContinuesInARow) {
                const allContinues = lastMessages.every(
                    (m: { content: any }) =>
                        (m.content as Content).action === "CONTINUE"
                );
                if (allContinues) {
                    return false;
                }
            }
        }

        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        if (
            message.content.text.endsWith("?") ||
            message.content.text.endsWith("!")
        ) {
            return;
        }

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        }

        state = await runtime.updateRecentMessageState(state);

        async function _shouldContinue(state: State): Promise<boolean> {
            // If none of the above conditions are met, use the generateText to decide
            const shouldRespondContext = composeContext({
                state,
                template: shouldContinueTemplate,
            });

            const response = await generateTrueOrFalse({
                context: shouldRespondContext,
                modelClass: ModelClass.SMALL,
                runtime,
            });

            return response;
        }

        const shouldContinue = await _shouldContinue(state);
        if (!shouldContinue) {
            elizaLogger.log("Not elaborating, returning");
            return;
        }

        const context = composeContext({
            state,
            template:
                runtime.character.templates?.continueMessageHandlerTemplate ||
                runtime.character.templates?.messageHandlerTemplate ||
                messageHandlerTemplate,
        });
        const { userId, roomId } = message;

        const response = await generateMessageResponse({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
        });

        response.inReplyTo = message.id;

        runtime.databaseAdapter.log({
            body: { message, context, response },
            userId,
            roomId,
            type: "continue",
        });

        // prevent repetition
        const messageExists = state.recentMessagesData
            .filter((m: { userId: any }) => m.userId === runtime.agentId)
            .slice(0, maxContinuesInARow + 1)
            .some((m: { content: any }) => m.content === message.content);

        if (messageExists) {
            return;
        }

        await callback(response);

        // if the action is CONTINUE, check if we are over maxContinuesInARow
        if (response.action === "CONTINUE") {
            const agentMessages = state.recentMessagesData
                .filter((m: { userId: any }) => m.userId === runtime.agentId)
                .map((m: { content: any }) => (m.content as Content).action);

            const lastMessages = agentMessages.slice(0, maxContinuesInARow);
            if (lastMessages.length >= maxContinuesInARow) {
                const allContinues = lastMessages.every(
                    (m: string | undefined) => m === "CONTINUE"
                );
                if (allContinues) {
                    response.action = null;
                }
            }
        }

        return response;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "we're planning a solo backpacking trip soon",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "oh sick", action: "CONTINUE" },
            },
            {
                user: "{{user2}}",
                content: { text: "where are you going" },
            },
        ],
    ] as ActionExample[][],
} as Action;
