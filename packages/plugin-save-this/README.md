# @ai16z/plugin-save-this
# saveThisPlugin

A plugin for Eliza that enables saving information from conversations as knowledge records.

## Description

The save-this plugin allows users to save important information from their conversations with Eliza for later reference. When a user starts a message with "save this", the plugin will process and store that information in the knowledge base, using the knowledge.set() method.

This will create a document record in the memories table, with associated fragments for each message. The plugin will then provide a confirmation message to the user, such as "I've stored the information for you."

In order to decide what to save, the action handler makes a generateText request to the llm with the last 7 messages. The prompt is carefully designed to extract the most relevant information from the conversation.

## Installation

```bash
pnpm add @ai16z/plugin-save-this
```

## Usage

1. Import and register the plugin:

```typescript
import { saveThisPlugin } from '@ai16z/plugin-save-this';


2. Use in conversation:

```
User: "save this: The meeting with John is scheduled for tomorrow at 2 PM"
Eliza: "I've stored the information for you"
```

## Configuration

No additional configuration is required. The plugin uses Eliza's built-in knowledge storage system.

### Triggering and use of State.

Instead of an ACTION based trigger, the plugin uses the Provider to monitor for an explicit "save this" keyphrase at the beginning of a message.  A typical action based trigger is not used, because I found that when multiple SAVE_MEMORY requests are done, eventually the LLM decides to start saving all messages to memory, and that is probably not what we want to do.

If the "save this" keyphrase is found, the Provider will set a state variable to allow the action to proceed.  So if the SAVE_THIS action is somehow triggered in another way, the handler aborts.

## License

MIT
