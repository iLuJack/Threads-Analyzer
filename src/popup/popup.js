document.getElementById('viewStats').addEventListener('click', () => {
  chrome.tabs.create({ url: 'src/stats/stats.html' });
});

document.getElementById('startAnalysis').addEventListener('click', async () => {
  const button = document.getElementById('startAnalysis');
  const status = document.getElementById('status');
  
  button.disabled = true;
  button.classList.add('analyzing');
  button.textContent = 'Analyzing...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'startAnalysis' }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Please refresh the page and try again';
        resetButton();
        return;
      }

      if (response?.status === 'started') {
        status.textContent = 'Analysis in progress...';
      } else {
        status.textContent = 'Please navigate to a Threads.net page first';
        resetButton();
      }
    });
  } catch (error) {
    status.textContent = 'Error: Could not start analysis';
    resetButton();
  }

  function resetButton() {
    button.disabled = false;
    button.classList.remove('analyzing');
    button.textContent = 'Start Analysis';
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'analysisComplete') {
    document.getElementById('status').textContent = request.message;
  }
}); 