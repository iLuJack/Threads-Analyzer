let isAnalyzing = false;
let processedPosts = new Set();
let isScrolling = false;
const SCROLL_INTERVAL = 1000; 
const SCROLL_AMOUNT = 1200; 
let processedData = {}; 
let allPostElements = new Set(); 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAnalysis' && window.location.href.includes('threads.net')) {
    isAnalyzing = true;
    isScrolling = true;
    processedPosts.clear();
    allPostElements.clear();
    
    const initialPosts = document.querySelectorAll('[data-pressable-container="true"]');    
    initialPosts.forEach(post => allPostElements.add(post));

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false
    });

    setTimeout(collectAndScroll, 1000);
    sendResponse({ status: 'started' });
    return true;
  }
});

// Modified observer to only collect posts
const observer = new MutationObserver(mutations => {
  if (!isAnalyzing) return;
  
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const posts = node.querySelectorAll('[data-pressable-container="true"]');
        posts.forEach(post => allPostElements.add(post));
      }
    });
  });
});

// New function to only scroll until we reach the bottom
async function collectAndScroll() {
  if (!isScrolling) return;

  const previousHeight = document.body.scrollHeight;
  const scrollPosition = window.scrollY + window.innerHeight;
  
  window.scrollBy(0, SCROLL_AMOUNT);
  await new Promise(resolve => setTimeout(resolve, SCROLL_INTERVAL));
  
  const currentHeight = document.body.scrollHeight;

  if (currentHeight === previousHeight && scrollPosition >= currentHeight - 100) {
    isScrolling = false;
    await processAllCollectedPosts();
    return;
  }

  await collectAndScroll();
}

// New function to process all collected posts
async function processAllCollectedPosts() {  
  for (const post of allPostElements) {
    try {
      const hasContent = post.querySelector('.x1a6qonq.x6ikm8r.x10wlt62.xj0a0fe.x126k92a.x6prxxf.x7r5mf7');
      const hasAuthor = post.querySelector('span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
      
      if (hasContent && hasAuthor) {
        await processPost(post);
      }
    } catch (error) {
      console.error('Error processing post:', error);
    }
  }

  console.log('All posts processed, saving to storage...');
  await saveAllPostStats();
  
  // Send completion message back to popup
  chrome.runtime.sendMessage({
    action: 'analysisComplete',
    message: 'Posts processed successfully!'
  });
  
  isAnalyzing = false;
  allPostElements.clear(); // Clear the set after processing
}

async function processPost(postElement) {
  const content = getContent(postElement);
  const timestamp = getTimestamp(postElement);
  const postIdentifier = `${content}_${timestamp}`;
  
  if (processedPosts.has(postIdentifier)) {
    return;
  }
  
  processedPosts.add(postIdentifier);

  const stats = {
    author: getAuthor(postElement),
    content: content,
    timestamp: timestamp,
    likes: getStatCount(postElement, 'Like'),
    replies: getStatCount(postElement, 'Reply'),
    reposts: getStatCount(postElement, 'Repost'),
    shares: getStatCount(postElement, 'Share')
  };

  // Store in memory instead of saving to storage immediately
  processedData[timestamp] = stats;
}

function getContent(postElement) {
  const contentElement = postElement.querySelector('.x1a6qonq.x6ikm8r.x10wlt62.xj0a0fe.x126k92a.x6prxxf.x7r5mf7');
  const textSpans = contentElement?.querySelectorAll('span.x1lliihq.x1plvlek.xryxfnj');
  return Array.from(textSpans || [])
    .map(span => span.textContent.trim())
    .join(' ');
}

function getAuthor(postElement) {
  const authorElement = postElement.querySelector('span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
  return authorElement?.textContent.trim() || 'Unknown';
}

function getTimestamp(postElement) {
  const timeElement = postElement.querySelector('time.x1rg5ohu');
  const utcTime = timeElement?.getAttribute('datetime') || new Date().toISOString();
  
  // Convert to Taiwan time (UTC+8)
  const date = new Date(utcTime);
  return date.toLocaleString('zh-TW', { 
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // Use 24-hour format
  });
}

function getStatCount(postElement, type) {
  try {
    let svgElement = type === 'Like' 
      ? postElement.querySelector('svg[aria-label="Like"][role="img"], svg[aria-label="Unlike"][role="img"]')
      : postElement.querySelector(`svg[aria-label="${type}"][role="img"]`);
      
    if (!svgElement) return '0';
    
    const buttonContainer = svgElement.parentElement;
    const countSpan = buttonContainer.querySelector('span.x17qophe.x10l6tqk.x13vifvy');
    return parseAbbreviatedNumber(countSpan?.textContent || '0');
  } catch (error) {
    return '0';
  }
}

// Add this helper function
function parseAbbreviatedNumber(numStr) {
    if (!numStr) return '0';
    
    const number = numStr.toLowerCase().trim();
    
    if (number.endsWith('k')) {
        return String(parseFloat(number.replace('k', '')) * 1000);
    } else if (number.endsWith('m')) {
        return String(parseFloat(number.replace('m', '')) * 1000000);
    }
    
    return number;
}

// Replace savePostStats with a new function to save all data at once
async function saveAllPostStats() {  
  try {
    // Get current posts atomically
    const result = await chrome.storage.local.get(['threadsPosts']);
    const existingPosts = result.threadsPosts || {};
    
    // Merge existing posts with new posts
    const updatedPosts = { ...existingPosts, ...processedData };
    
    // Save all posts at once
    await chrome.storage.local.set({ threadsPosts: updatedPosts });
    
    // Clear the processed data after successful save
    processedData = {};
  } catch (error) {
    console.error('Error saving to storage:', error);
    throw error;
  }
}

