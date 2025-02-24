let session = null; //for starting off fresh when extension reloaded

//get state of local Gemini Nano model
async function initDefaults(){
    try{
        console.log(chrome);
        const defaults = await chrome.aiOriginTrial.languageModel.capabilities();
        console.log("Model defaults: ", defaults);
        if (defaults.available !== 'readily'){
            console.error(`Model not yet available (current state: "${defaults.available}")`);
            return null;
        }
        return defaults;
    } catch (error) {
        console.error("Failed to initialize model: ", error);
        return null;
    }
}

//initialize local Gemini Nano model
async function initSession(){
    try {
        const params = { //system prompt
            systemPrompt: `
You are an AI-powered autocomplete assistant for a Chrome extension. Your goal is to provide **one-sentence** continuations of user input while ensuring natural, grammatically correct text. Follow these strict rules:

1. **Do not repeat the user's input in the response.** Always generate a continuation without including the original text.

2. **Sentence Completion:** If the input is an incomplete sentence, complete it naturally.
   - Example: If the input is "I went to the ", respond with "beach."

3. **Sentence Follow-up:** If the input is a complete sentence, generate one related follow-up sentence.
   - Example: If the input is "I love reading.", respond with "My favorite books are science fiction novels."

4. **Word Completion:** If the input is a partial word, complete the word and continue with a natural sentence.
   - Example: If the input is "helicop", respond with "ter flew over the city."

5. **Spacing Rules:**
   - **If the input ends with a complete word, but does not end with a space character, start the response with a single space.**  
     - Example: If the input is "I like", respond with " books."
   - **If the input ends with a space character, do NOT add an extra leading space.**  
     - Example: If the input is "I like ", respond with "to read books."
   - **This ensures that the input and response form a grammatically correct sentence when joined.**

6. **Response Length:** **Limit output to one sentence only.** No long paragraphs.

7. **Strict Avoidance of Input Repetition:** Never start the response with the user's input. Never echo back the input.

8. **Do not end with new line characters (\n)**.

Ensure all responses are fluid, natural, and concise.`
        }
        if (!session){ //if no session, start one
            const defaults = await initDefaults();
            if (defaults){
                session = await chrome.aiOriginTrial.languageModel.create(params);   
                console.log("Session created");         
            }
        }
        return session;
    } catch (error) {
        console.error("Error creating session: ", error);
    }
}

//sends prompt to Nano for autocomplete
async function handleCompletion(text){
    const currentSession = await initSession();
    if (!currentSession){
        console.error("Failed to initialize session");
    }
    const result = await currentSession.prompt(text);
    console.log("Completion result: ");
    return result;
}

//listen for messages sent from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message: ", message);
    if (message.type === 'GET_COMPLETION'){
        handleCompletion(message.text)
            .then(completion => sendResponse({completion}))
            .catch(error => sendResponse({error: error.message}));
        return true;
    }
})

//start new session on reload extension 
initSession().then(() => console.log("Init session complete"));