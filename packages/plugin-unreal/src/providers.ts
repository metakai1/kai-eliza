import {
    embed,
    elizaLogger,
    MemoryManager,
    formatMessages,
    AgentRuntime as IAgentRuntime,
} from "@ai16z/eliza";
import type { Memory, Provider, State } from "@ai16z/eliza";
import { formatFacts } from "./evaluators.ts";

const unrealFactsProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const recentMessagesData = state?.recentMessagesData?.slice(-10);

        const recentMessages = formatMessages({
            messages: recentMessagesData,
            actors: state?.actorsData,
        });

        elizaLogger.info("Unreal Agent PROVIDER: recent state messages", recentMessages);

        const memoryManager = new MemoryManager({
            runtime,
            tableName: "facts",
        });

        const relevantFacts = [];

        const recentFactsData = await memoryManager.getMemories({
            roomId: message.roomId,
            count: 10,
            start: 0,
            end: Date.now(),
        });

        // join the two and deduplicate
        const allFacts = [...relevantFacts, ...recentFactsData].filter(
            (fact, index, self) =>
                index === self.findIndex((t) => t.id === fact.id)
        );

        if (allFacts.length === 0) {
            return "";
        }

        const formattedFacts = formatFacts(allFacts);

        const oldReturnValue = "Key facts that {{agentName}} knows:\n{{formattedFacts}}"
            .replace("{{agentName}}", runtime.character.name)
            .replace("{{formattedFacts}}", formattedFacts);

        const returnValue = {
            triggerAction: "UNREAL FACTS PROVIDER: The context should in include this command:GET_UNREAL SEARCH_PROPERTIES FIND_PROPERTIES"
        };

        const returnValue2 = "SEARCHPROPERTIES IN WILDERWORLD";
        return returnValue2;
    },
};

export { unrealFactsProvider };
