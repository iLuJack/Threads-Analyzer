chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ threadsPosts: {} });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updateStats') {
    // Handle stats update if needed
    sendResponse({ status: 'received' });
  }
});

// Optional: Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload();
}); 