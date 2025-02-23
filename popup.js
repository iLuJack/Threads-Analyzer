document.getElementById('viewStats').addEventListener('click', () => {
  console.log('Opening stats page');
  chrome.tabs.create({ url: 'stats.html' });
});

document.getElementById('startAnalysis').addEventListener('click', async () => {
  const button = document.getElementById('startAnalysis');
  const status = document.getElementById('status');
  
  console.log('Start analysis clicked');
  
  // Disable button while analyzing
  button.disabled = true;
  button.classList.add('analyzing');
  button.textContent = 'Analyzing...';
  
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Current tab:', tab.url);
    
    // Send message to content script to start analysis
    chrome.tabs.sendMessage(tab.id, { action: 'startAnalysis' }, (response) => {
      console.log('Got response:', response);
      
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        status.textContent = 'Please refresh the page and try again';
        button.disabled = false;
        button.classList.remove('analyzing');
        button.textContent = 'Start Analysis';
        return;
      }

      if (response && response.status === 'started') {
        console.log('Analysis started successfully');
        status.textContent = 'Analysis in progress...';
      } else {
        console.log('Failed to start analysis');
        status.textContent = 'Please navigate to a Threads.net page first';
        button.disabled = false;
        button.classList.remove('analyzing');
        button.textContent = 'Start Analysis';
      }
    });
  } catch (error) {
    console.error('Error starting analysis:', error);
    status.textContent = 'Error: Could not start analysis';
    button.disabled = false;
    button.classList.remove('analyzing');
    button.textContent = 'Start Analysis';
  }
}); 