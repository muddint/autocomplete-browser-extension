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
}`;
document.head.appendChild(style);

//create overlay element to show suggestion next to text
const createOverlay = (textarea) => { 
    const overlay = document.createElement('div');
    overlay.className = 'suggestion-overlay';  
    document.body.appendChild(overlay);
    return overlay;
}

//update styling of overlay to match textarea
const updateOverlay = () => {
    if (!activeTextArea || !activeOverlay){
        return;
    }
    //get current style of textarea
    const computedStyle = window.getComputedStyle(activeTextArea);
    activeOverlay.style.width = computedStyle.width;
    activeOverlay.style.height = computedStyle.height;
    activeOverlay.style.font = computedStyle.font;
    activeOverlay.style.padding = computedStyle.padding;
    activeOverlay.style.border = computedStyle.border;
    activeOverlay.style.boxSizing = computedStyle.boxSizing;

    //positioning
    const rect = activeTextArea.getBoundingClientRect();
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
        activeTextArea.value = activeOverlay.textContent;
    }
    //clear suggestion if anything else or after accepting
    activeOverlay.textContent = '';
}

//clear when input area out of focus
const handleBlur = (event) => {
    if (activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
        activeTextArea = null;
    }
    handleStopType.cancel();
}

const handleFocus = (event) => {
    const textarea = event.target;
    if (activeOverlay) { //cleanup if another overlay exists
        activeOverlay.remove();
        activeOverlay = null;
        activeTextArea = null;
    }
    //set active text area and make overlay
    activeOverlay = document.createElement('div');
    activeOverlay.className = 'suggestion-overlay';
    document.body.appendChild(activeOverlay);
    activeTextArea = textarea;
    //update positioning and styling
    updateOverlay(textarea);
}

const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries){
        if (entry.target === activeTextArea && activeOverlay){
            updateOverlay();
        }
    }
});


const setupTextArea = (textarea) => {

    //event listeners
    textarea.addEventListener('input', handleStopType); //add listener to handle typing
    textarea.addEventListener('keydown', handleKeydown); //tab accept
    textarea.addEventListener('blur', handleBlur); //clear when out of focus
    textarea.addEventListener('focus', handleFocus); //add overlay when in focus

    resizeObserver.observe(textarea);
}


//handle deletion
const cleanupTextArea = (textarea) => {
    resizeObserver.unobserve(textarea);
    if (textarea === activeTextArea && activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
        activeTextArea = null;
    }
}

//communicates with background services to autocomplete
const autocomplete = async (event) => {
    if (!activeTextArea || !activeOverlay){
        return;
    }

    const currentText = activeTextArea.value;
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
const handleStopType = debounce(autocomplete, 1500);


//mutation observer for dynamic textareas
const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.removedNodes.forEach((node) => {
            if (node.nodeName === 'TEXTAREA'){ 
                cleanupTextArea(node);  
            } else if (node.querySelectorAll){ //if node can have elements
                node.querySelectorAll('textarea').forEach(cleanupTextArea); //cleanup for all textarea elements
            }
        });
        mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'TEXTAREA'){
                setupTextArea(node); 
            } else if (node.querySelectorAll){ //if node can have elements
                node.querySelectorAll('textarea').forEach(setupTextArea); //setup for all textarea elements
            }
        })
    })
});

mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
});

//add autocomplete to all textareas
const textareas = document.querySelectorAll('textarea');

let activeOverlay = null;
let activeTextArea = null;

//setup all textareas 
textareas.forEach(setupTextArea);

window.addEventListener('scroll', updateOverlay); //scrolling
window.addEventListener('resize', updateOverlay); //resizing
window.visualViewport.addEventListener('scroll', updateOverlay); //zooming