const autocomplete = (event) => {
    const textarea = event.target;
    console.log("text are changed in: ", textarea);  
    console.log("new value: ", textarea.value);
}

const debounce = (callback, wait) => {
    let timeoutID = null;
    return (...args) => {
        window.clearTimeout(timeoutID);
        timeoutID = window.setTimeout(() => {
            callback(...args);
        }, wait);
    }
}

const handleStopType = debounce(autocomplete, 1500);

const textareas = document.querySelectorAll('textarea')

textareas.forEach((textarea) => {
    textarea.addEventListener('input', handleStopType)
})