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
const updateOverlay = (textarea, overlay) => {
    //get current style of textarea
    const computedStyle = window.getComputedStyle(textarea);
    overlay.style.width = computedStyle.width;
    overlay.style.height = computedStyle.height;
    overlay.style.font = computedStyle.font;
    overlay.style.padding = computedStyle.padding;
    overlay.style.border = computedStyle.border;
    overlay.style.boxSizing = computedStyle.boxSizing;

    //positioning
    const rect = textarea.getBoundingClientRect();
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
}


//update all overlay positions when necessary
const updateAllOverlays = () => {
    textareas.forEach((textarea) => {
        const overlay = overlayMap.get(textarea);
        updateOverlay(textarea, overlay);
    })
}

//check for tab to accept
const handleKeydown = (event) => {
    const textarea = event.target;
    const overlay = overlayMap.get(textarea);

    if (overlay.textContent === ''){
        return;
    }
    if (event.key === 'Tab'){ //accept suggestion
        event.preventDefault();
        textarea.value = overlay.textContent;
    }
    //clear suggestion if anything else or after accepting
    overlay.textContent = '';
}

//clear when input area out of focus
const handleBlur = (event) => {
    const textarea = event.target;
    const overlay = overlayMap.get(textarea);
    overlay.textContent = '';
}

const setupTextarea = (textarea) => {
    //overlay setup
    const overlay = createOverlay(textarea); //make overlay 
    overlayMap.set(textarea, overlay);  //link to text area
    updateOverlay(textarea, overlay);   //update overlay position

    //resize observer setup
    const resizeObserver = new ResizeObserver(updateAllOverlays);
    resizeObserver.observe(textarea);
    resizeObserverMap.set(textarea, resizeObserver);

    //event listeners
    textarea.addEventListener('input', handleStopType); //add listener to handle typing
    textarea.addEventListener('keydown', handleKeydown); //tab accept
    textarea.addEventListener('blur', handleBlur); //clear when out of focus
}

//handle deletion
const cleanupTextarea = (textarea) => {
    const overlay = overlayMap.get(textarea);
    const resizeObserver = resizeObserverMap.get(textarea);
    if (overlay) {
        overlay.remove();
        overlayMap.delete(textarea);
    }
    if (resizeObserver){
        resizeObserver.disconnect();
        resizeObserverMap.delete(textarea);
    }
}

//communicates with background services to autocomplete
const autocomplete = async (event) => {
    const textarea = event.target;
    const currentText = textarea.value;
    const overlay = overlayMap.get(textarea);
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
            overlay.textContent = '';
            return;
        }

        if (response.error){
            console.error("Error getting completion: ", response.error);
            overlay.textContent = '';
            return;
        }

        const suggestionText = response.completion;
        if (suggestionText){
            overlay.textContent = currentText + suggestionText;
            console.log("Autocomplete suggestion: ", suggestionText);
            console.log("Combined text: ", currentText + suggestionText);
        } else {
            console.error("No completion received in response");
            overlay.textContent = '';
        }

    } catch (error) {
        console.log("Error getting autocomplete suggestion: ", error);
        overlay.textContent = '';
    }
}

//debouncer function
const debounce = (callback, wait) => {
    let timeoutID = null;
    return (...args) => {
        window.clearTimeout(timeoutID);
        timeoutID = window.setTimeout(() => {
            callback(...args);
        }, wait);
    }
}

//debounced autocomplete
const handleStopType = debounce(autocomplete, 2500);


//mutation observer for dynamic textareas
const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.removedNodes.forEach((node) => {
            if (node.nodeName === 'TEXTAREA'){ 
                cleanupTextarea(node);  
            } else if (node.querySelectorAll){ //if node can have elements
                node.querySelectorAll('textarea').forEach(cleanupTextarea); //cleanup for all textarea elements
            }
        });
        mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'TEXTAREA'){
                setupTextarea(node); 
            } else if (node.querySelectorAll){ //if node can have elements
                node.querySelectorAll('textarea').forEach(setupTextarea); //setup for all textarea elements
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
const overlayMap = new WeakMap();
const resizeObserverMap = new WeakMap();

//setup all textareas 
textareas.forEach(setupTextarea);

window.addEventListener('scroll', updateAllOverlays); //scrolling
window.addEventListener('resize', updateAllOverlays); //resizing
window.visualViewport.addEventListener('scroll', updateAllOverlays); //zooming