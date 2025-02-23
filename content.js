let isAnalyzing = false;
let processedPosts = new Set();
let isScrolling = false;
const MAX_NO_NEW_POSTS = 3; // Stop if no new posts after 3 attempts
const SCROLL_INTERVAL = 1500; // 2 seconds between scrolls
const SCROLL_AMOUNT = 1600; // Pixels to scroll each time

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAnalysis' && window.location.href.includes('threads.net')) {
    isAnalyzing = true;
    isScrolling = true;
    processedPosts.clear();
    
    // Process initial posts first
    const initialPosts = document.querySelectorAll('[data-pressable-container="true"]');    
    initialPosts.forEach((post) => {
      const hasContent = post.querySelector('.x1a6qonq.x6ikm8r.x10wlt62.xj0a0fe.x126k92a.x6prxxf.x7r5mf7');
      const hasAuthor = post.querySelector('span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
      
      if (hasContent && hasAuthor) {
        processPost(post);
      }
    });

    // Start observing after processing initial posts
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false
    });

    // Wait a moment before starting auto-scroll to ensure initial posts are saved
    setTimeout(() => {
      processAndScroll();
    }, 1000);
    
    sendResponse({ status: 'started' });
    return true;
  }
});

// Observer to detect new posts as user scrolls
const observer = new MutationObserver((mutations) => {
  if (!isAnalyzing) return;
  
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Also check for posts within the node
        const posts = node.querySelectorAll('[data-pressable-container="true"]');
        posts.forEach((post) => {
          // Verify the post has the required content structure
          const hasContent = post.querySelector('.x1a6qonq.x6ikm8r.x10wlt62.xj0a0fe.x126k92a.x6prxxf.x7r5mf7');
          const hasAuthor = post.querySelector('span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
          
          if (hasContent && hasAuthor) {
            processPost(post);
          }
        });
      }
    });
  });
});

// Start observing with the correct configuration
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: false,
  attributes: false
});

async function processPost(postElement) {
  const content = getContent(postElement);
  const timestamp = getTimestamp(postElement);
  const postIdentifier = `${content}_${timestamp}`;
  
  if (processedPosts.has(postIdentifier)) {
    console.log('Post already processed:', postIdentifier);
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

  // Wait for storage operation to complete
  await savePostStats(stats);
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
  // First find the svg with aria-label
  const svgElement = postElement.querySelector(`svg[aria-label="${type}"]`);
  if (!svgElement) return '0';
  
  // Navigate up to find the parent container and then find the count span
  const container = svgElement.closest('.x6s0dn4.x17zd0t2.x78zum5.xl56j7k');
  if (!container) return '0';

  const countSpan = container.querySelector('span.x17qophe.x10l6tqk.x13vifvy');
  const count = countSpan?.textContent.match(/\d+/);
  
  return count ? count[0] : '0';
}

function savePostStats(stats) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['threadsPosts'], function(result) {
      const posts = result.threadsPosts || {};
      const postIdentifier = stats.timestamp;
      
      posts[postIdentifier] = stats;
      
      chrome.storage.local.set({ threadsPosts: posts }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving to storage:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('Successfully saved post to storage');
          resolve();
        }
      });
    });
  });
}

// Process initial posts on page load
document.querySelectorAll('article[role="article"]').forEach(processPost); 

async function processAndScroll() {
  if (!isScrolling) return;

  const currentPosts = document.querySelectorAll('[data-pressable-container="true"]');
  console.log('Found posts to process:', currentPosts.length);
  
  // Process posts sequentially
  for (const post of currentPosts) {
    try {
      const hasContent = post.querySelector('.x1a6qonq.x6ikm8r.x10wlt62.xj0a0fe.x126k92a.x6prxxf.x7r5mf7');
      const hasAuthor = post.querySelector('span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
      
      if (hasContent && hasAuthor) {
        // Wait for each post to be processed and saved
        await processPost(post);
        console.log('Post processed and saved successfully');
      }
    } catch (error) {
      console.error('Error processing post:', error);
    }
  }

  // After all posts are processed, scroll
  window.scrollBy(0, SCROLL_AMOUNT);

  // Wait for new content to load
  setTimeout(() => {
    const currentHeight = document.body.scrollHeight;
    
    if (window.innerHeight + window.scrollY >= currentHeight) {
      isScrolling = false;
      console.log('Reached the end of the feed');
      return;
    }

    // Continue with next batch
    processAndScroll();
  }, SCROLL_INTERVAL);
}

// Add a function to stop scrolling if needed
function stopScrolling() {
  isScrolling = false;
}
