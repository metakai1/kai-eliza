
when the user has indicated they want to search for properties, the START_PROPERTY_SEARCH action triggers.  then the provider should start injecting directions into the context, right?

so it could say somethign like "{username} is currently searching for wilder world properties. "

i'm not sure how it would all work.

what has to happen is that once the session has started, the user will say something like "what properties in space mind are near the ocean and are at least Macro in size?"

then the agent should run a generateObject() call as was done in this example.   so the user message gets passed into that function, which generates a JSON object from this system prompt:
