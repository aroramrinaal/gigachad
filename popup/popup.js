let stats = {
    facesDetected: 0,
    imagesProcessed: 0
};

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Initialize toggle state from storage
    chrome.storage.local.get(['enabled', 'stats'], (result) => {
        const toggle = document.getElementById('chadToggle');
        toggle.checked = result.enabled === undefined ? true : result.enabled;
        
        if (result.stats) {
            stats = result.stats;
            updateStatsDisplay();
        }
    });

    // Add toggle event listener
    document.getElementById('chadToggle').addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        
        // Save state to storage
        await chrome.storage.local.set({ enabled });
        
        // Send message to content script
        chrome.tabs.sendMessage(tab.id, {
            action: 'toggleGigachad',
            enabled: enabled
        });
    });
});

// Update stats display
function updateStatsDisplay() {
    document.getElementById('facesDetected').textContent = stats.facesDetected;
    document.getElementById('imagesProcessed').textContent = stats.imagesProcessed;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'statsUpdate') {
        stats = message.stats;
        updateStatsDisplay();
        // Save stats to storage
        chrome.storage.local.set({ stats });
    }
});
