let stats = {
    facesDetected: 0,
    imagesProcessed: 0
};

// Add this at the top with your other variables
const chadJokes = [
    "Time to get gigachaded 💪",
    "Average face fan vs Gigachad enjoyer 🗿",
    "Making the internet more sigma 😎", 
    "Virgin regular browsing vs Chad filter enabled 💪",
    "Turning normies into legends 🔱",
    "Peak performance activated 💯",
    "Ascending to chadhood 👑",
    "Embrace the sigma grindset 💰",
    "Reject weakness, become gigachad 💪",
    "That's how mafia works 😤",
    "Sigma rule #1: Enable gigachad mode 😎",
    "Average fan vs Average enjoyer 🗿",
    "Mirin' the gains brah? 💪",
    "We're all gonna make it 🔱",
    "Become ungovernable 👑",
    "Sigma grindset activated 💯",
    "Asserting dominance one page at a time 💪",
    "Can you hear the sigma theme? 🎵",
    "Gigachad energy intensifies 😤",
    "Living the sigma lifestyle 😎"
];

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

    // Add this to your DOMContentLoaded event listener
    document.querySelector('.chad-joke').textContent = chadJokes[Math.floor(Math.random() * chadJokes.length)];
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
