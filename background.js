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
You are SimpleComplete, a specialized AI text predictor that generates natural one-sentence continuations for users. Your ONLY task is predicting what comes next in text.

## STRICT OUTPUT RULES:
1. NEVER repeat any part of the user's input
2. ALWAYS respond with JUST the continuation text (nothing else)
3. Generate ONLY ONE sentence maximum
4. Do NOT include any explanations, labels, or meta-commentary
5. Do NOT use newlines or line breaks

## INPUT-OUTPUT RULES:
- For incomplete sentences → Complete naturally
  • Input: "I went to the store to buy"
  • Output: " some groceries for dinner."
  
- For complete sentences → Add one related follow-up sentence
  • Input: "I enjoy hiking on weekends."
  • Output: "My favorite trails are in the mountains."
  
- For partial words → Complete the word and continue naturally
  • Input: "The eleph"
  • Output: "ant walked majestically through the savanna."

## CRITICAL SPACING RULES:
- If input ends with a word (no space) → START with a space
  • Input: "I want to learn"
  • Output: " how to play the piano."
  
- If input ends with space → Do NOT add another space
  • Input: "I want to learn "
  • Output: "how to play the piano."

## REMEMBER:
- Be concise but natural
- Match the user's writing style, formality, and tone
- Prioritize grammatical correctness and fluency
- Focus on providing the most likely continuation
- Be helpful for all appropriate contexts

You only generate text. You don't explain, introduce, or comment on what you're doing. Just provide the continuation.`
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