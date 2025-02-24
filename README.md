# autocomplete-browser-extension

A chrome extension to autocomplete your text with the locally run Gemini Nano.

# Getting started
## Running Locally
1. Set up Google Chrome environment:
    1. Ensure device meets the following requirements:
        - **Operating system:** Windows 10 or 11; macOS 13+ (Ventura and onwards); or Linux
        - **Storage:** At least 22 GB on volume containing Chrome profile
        - **GPU:** At least 4GB of VRAM
    2. Ensure Chrome version is between Chrome 131 to 136 (inclusive).
    3. Enable required Chrome experiments at [`chrome://flags`](chrome://flags):
        - Set [`Enables optimization guide on device`](chrome://flags/#optimization-guide-on-device-model) to `Enabled BypassPerfRequirements`
        - Set [`Prompt API for Gemini Nano`](prompt-api-for-gemini-nano) to `Enabled`
        - You will need to relaunch Chrome for these to take effect and to continue
    4. Make sure Gemini Nano is downloaded at [`chrome://components`](chrome://components):
        - Find Optimization Guide On Device Model
        - Make sure it exists and the status is Up-to-date
        - If the status is downloading, wait
        - If the component does not exist try the following fix (as of Chrome v133) 
            - Open the Dev Console and enter `await window.ai.languageModel.create()`
            - Check components again
2. Set up Chrome extension:
    1. Clone this repository 
    2. Go to [`chrome://extensions/`](chrome://extensions/)
    3. Enable `Developer Mode` if not already enabled
    4. Click `Load Unpacked` and select the cloned project repository
    5. Extension should now be loaded, enjoy autocomplete!

