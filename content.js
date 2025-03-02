//styling for autocomplete suggestion
const style = document.createElement('style'); 
style.textContent = `
.suggestion-overlay {
    position: absolute;
    pointer-events: none;
    color: #666;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    padding: inherit;
    border: none;
    overflow: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    z-index: 10000;
}`;
document.head.appendChild(style);

let activeOverlay = null;
let activeInput = null;

//check if element is text input field

const isInputField = (element) => {
    if (element.nodeName === 'TEXTAREA') { // if text area
        return true;
    } 
    if (element.nodeName === 'INPUT' &&   // if input type text or search (if none, default is type)
        (element.type === 'text' ||
         element.type === 'search' ||
         !element.hasAttribute('type')
        ) 
    ) {
        return true;
    }
    if (element.getAttribute && element.getAttribute('contenteditable') === 'true') { // if editable div
        return true;
    }
    return false;
}

//getter for various input elements
const getInputText = (element) => {
    if (element.nodeName === 'TEXTAREA' || element.nodeName === 'INPUT'){
        console.log('field is textarea or input')
        return element.value;
    } else if (element.getAttribute && element.getAttribute('contenteditable') === 'true'){
        console.log('field is editable div')
        return element.textContent;
    }
    console.log('could not get text input')
    return '';
}

//setter for various input elements
const setInputText = (element, text) => {
    if (element.nodeName === 'TEXTAREA' || element.nodeName === 'INPUT'){
        element.value = text;
    } else if (element.getAttribute && element.getAttribute('contenteditable') === 'true'){
        element.textContent = text;
        //send input event to site
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        element.dispatchEvent(event);
    }
}

//create overlay element to show suggestion next to text
const createOverlay = () => { 
    const overlay = document.createElement('div');
    overlay.className = 'suggestion-overlay';  
    document.body.appendChild(overlay);
    return overlay;
}

//update styling of overlay to match text input
const updateOverlay = () => {
    if (!activeInput || !activeOverlay){
        return;
    }
    //get current style of textarea
    const computedStyle = window.getComputedStyle(activeInput);

    //font styling
    activeOverlay.style.font = computedStyle.font;
    activeOverlay.style.fontSize = computedStyle.fontSize;
    activeOverlay.style.fontFamily = computedStyle.fontFamily;
    activeOverlay.style.lineHeight = computedStyle.lineHeight;
    activeOverlay.style.letterSpacing = computedStyle.letterSpacing;
    activeOverlay.style.textIndent = computedStyle.textIndent;
    activeOverlay.style.whiteSpace = computedStyle.whiteSpace;
    
    if (activeInput.nodeName === 'TEXTAREA' || activeInput.nodeName === 'INPUT') { //textarea and input
        activeOverlay.style.width = computedStyle.width;
        activeOverlay.style.height = computedStyle.height;
        
        activeOverlay.style.padding = computedStyle.padding;

        activeOverlay.style.border = computedStyle.border;
        activeOverlay.style.boxSizing = computedStyle.boxSizing;
    } else if (activeInput.getAttribute && activeInput.getAttribute('contenteditable') === 'true') { //editable div
        activeOverlay.style.width = `${activeInput.offsetWidth}px`;
        activeOverlay.style.height = `${activeInput.offsetHeight}px`;

        activeOverlay.style.padding = computedStyle.padding;
    }
    
    //positioning
    const rect = activeInput.getBoundingClientRect();
    activeOverlay.style.top = `${rect.top + window.scrollY}px`;
    activeOverlay.style.left = `${rect.left + window.scrollX}px`;

}

//check for tab to accept
const handleKeydown = (event) => {
    if (!activeOverlay || activeOverlay.textContent === ''){
        return;
    }
    if (event.key === 'Tab'){ //accept suggestion
        event.preventDefault();
        setInputText(activeInput, activeOverlay.textContent);
        activeInput.value = activeOverlay.textContent;
    }
    //clear suggestion if anything else or after accepting
    activeOverlay.textContent = '';
}

//clear when input area out of focus
const handleBlur = (event) => {
    if (activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
        activeInput = null;
    }
    handleStopType.cancel();
}

const handleFocus = (event) => {
    const textInput = event.target;
    // if not text, stop
    if (! isInputField(textInput)){
        return;
    }
    if (activeOverlay) { //cleanup if another overlay exists
        activeOverlay.remove();
        activeOverlay = null;
    }
    //set active text area and make overlay
    activeOverlay = document.createElement('div');
    activeOverlay.className = 'suggestion-overlay';
    document.body.appendChild(activeOverlay);
    activeInput = textInput;
    //update positioning and styling
    updateOverlay();
}

const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries){
        if (entry.target === activeInput && activeOverlay){
            updateOverlay();
        }
    }
});


const setupTextInput = (textInput) => {
    if (! isInputField(textInput)){
        return;
    }
    //event listeners
    textInput.addEventListener('input', handleStopType); //add listener to handle typing
    textInput.addEventListener('keydown', handleKeydown); //tab accept
    textInput.addEventListener('blur', handleBlur); //clear when out of focus
    textInput.addEventListener('focus', handleFocus); //add overlay when in focus

    resizeObserver.observe(textInput);
}


//handle deletion
const cleanupTextInput = (textInput) => {
    if (! isInputField(textInput)){
        return;
    }
    resizeObserver.unobserve(textInput);
    if (textInput === activeInput) {
        cleanupOverlay();
    }
    
    textInput.removeEventListener('input', handleStopType); 
    textInput.removeEventListener('keydown', handleKeydown); 
    textInput.removeEventListener('blur', handleBlur); 
    textInput.removeEventListener('focus', handleFocus); 
}

const cleanupOverlay = () => {
    if (activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
        activeInput = null;
    }
}



//communicates with background services to autocomplete
const autocomplete = async (event) => {
    if (!activeInput || !activeOverlay){
        return;
    }

    const currentText = getInputText(activeInput);
    console.log("Current text: ", currentText);  

    try {
        console.log("sending request to bg script...");
        const response = await chrome.runtime.sendMessage({ //send message to background
            type: 'GET_COMPLETION',
            text: currentText
        });
        
        console.log("received response:", response);

        if (!response) {
            console.error("No response received from background script");
            activeOverlay.textContent = '';
            return;
        }

        if (response.error){
            console.error("Error getting completion: ", response.error);
            activeOverlay.textContent = '';
            return;
        }
        
        const suggestionText = response.completion;
        if (suggestionText){
            activeOverlay.textContent = currentText + suggestionText;
            console.log("Autocomplete suggestion: ", suggestionText);
            console.log("Combined text: ", currentText + suggestionText);
        } else {
            console.error("No completion received in response");
            activeOverlay.textContent = '';
        }

    } catch (error) {
        console.log("Error getting autocomplete suggestion: ", error);
        activeOverlay.textContent = '';
    }
}

//debouncer function
const debounce = (callback, wait) => {
    let timeoutID = null;
    const debouncer = (...args) => {
        window.clearTimeout(timeoutID);
        timeoutID = window.setTimeout(() => {
            callback(...args);
        }, wait);
    }
    //add cancellability
    debouncer.cancel = () => {
        window.clearTimeout(timeoutID);
        timeoutID = null;
    }
    return debouncer;
}

//debounced autocomplete
const handleStopType = debounce(autocomplete, 3000);


//mutation observer for dynamic text input
const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        //watch removed nodes
        mutation.removedNodes.forEach((node) => {
            if (isInputField(node)){ 
                cleanupTextInput(node);  
            } else if (node.querySelectorAll){ //if node can have elements
                const textInputs = node.querySelectorAll('textarea, input[type="text"], input[type="search"], [contenteditable="true"]');
                textInputs.forEach(cleanupTextInput); 
            }
        });
        //watch added nodes
        mutation.addedNodes.forEach((node) => {
            if (isInputField(node)){ 
                setupTextInput(node);   
            } else if (node.querySelectorAll){ 
                const textInputs = node.querySelectorAll('textarea, input[type="text"], input[type="search"], [contenteditable="true"]');
                textInputs.forEach(setupTextInput);
            }
        })
    })
});

const setupAllInputFields = () => {
    document.querySelectorAll('textarea, input[type="text"], input[type="search"], [contenteditable="true"]').forEach(setupTextInput);
}

mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
});

//setup all text input
setupAllInputFields();

window.addEventListener('scroll', updateOverlay); //scrolling
window.addEventListener('resize', updateOverlay); //resizing
window.visualViewport.addEventListener('scroll', updateOverlay); //zooming

window.addEventListener('load', setupAllInputFields);
document.addEventListener('DOMContentLoaded', setupAllInputFields);