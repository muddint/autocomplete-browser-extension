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

//add autocomplete to all textareas
const textareas = document.querySelectorAll('textarea');
const overlayMap = new Map();

textareas.forEach((textarea) => {
    const overlay = createOverlay(textarea); //make overlay 
    overlayMap.set(textarea, overlay);  //link to text area
    updateOverlay(textarea, overlay);   //update overlay position
    textarea.addEventListener('input', handleStopType); //add listener to handle typing
})

window.addEventListener('scroll', updateAllOverlays); //scrolling
window.addEventListener('resize', updateAllOverlays); //resizing
window.visualViewport.addEventListener('scroll', updateAllOverlays); //zooming