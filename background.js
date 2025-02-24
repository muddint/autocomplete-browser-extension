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
            systemPrompt: `Generate a suitable phrase to complete the given prompt. The input will be a partial sentence, and you should respond with an appropriate output that maintains the context and follows the input's grammatical structure. Ensure that your response has a leading space to allow for proper concatenation with the input. Make sure the output does not reference or repeat the input directly.

            **Example Format:**
            - Input: "Today I am"
            - Output: " feeling great."

            **Steps to Follow:**
            1. Identify the context of the provided input.
            2. Generate a phrase that naturally completes the sentence.
            3. Add a leading space before the output to avoid word merging.
            4. Ensure the grammatical structure aligns with common sentence patterns.

            # Output Format
            - The output should be a single phrase prefixed by a space, suitable for concatenation with the input sentence.

            # Example Outputs
            - Input: "I feel"
            Output: " amazing today."
            - Input: "This is"
            Output: " a wonderful moment."

            # Notes
            - Consider varying emotional tones and contexts based on the input to provide a diverse range of completions.`
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