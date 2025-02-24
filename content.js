//communicates with background services to autocomplete
const autocomplete = async (event) => {
    const textarea = event.target;
    const currentText = textarea.value;
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
            return;
        }

        if (response.error){
            console.error("Error getting completion: ", response.error);
            return;
        }

        const suggestionText = response.completion;
        if (suggestionText){
            console.log("Autocomplete suggestion: ", suggestionText);
            console.log("Combined text: ", currentText + suggestionText);
        } else {
            console.error("No completion received in response");
        }

    } catch (error) {
        console.log("Error getting autocomplete suggestion: ", error);
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
const handleStopType = debounce(autocomplete, 1500);

//add autocomplete to all textareas
const textareas = document.querySelectorAll('textarea');
textareas.forEach((textarea) => {
    textarea.addEventListener('input', handleStopType);
})