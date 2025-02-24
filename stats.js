import { icons } from './icons.js';

function displayStats() {
  chrome.storage.local.get(['threadsPosts'], function(result) {
    const posts = result.threadsPosts || {};
    const postsContainer = document.getElementById('posts');
    const summary = document.getElementById('summary');

    if (!postsContainer || !summary) return;

    // Display summary
    const totalPosts = Object.keys(posts).length;
    const totalLikes = Object.values(posts).reduce((sum, post) => sum + parseInt(post.likes || 0), 0);
    const totalReplies = Object.values(posts).reduce((sum, post) => sum + parseInt(post.replies || 0), 0);
    const totalReposts = Object.values(posts).reduce((sum, post) => sum + parseInt(post.reposts || 0), 0);
    
    summary.innerHTML = `
      <div class="summary-stats">
        <div class="stat-box">
          <h3>Total Posts</h3>
          <div class="value">${totalPosts}</div>
        </div>
        <div class="stat-box">
          <h3>Total Likes</h3>
          <div class="value">${formatNumber(totalLikes)}</div>
        </div>
        <div class="stat-box">
          <h3>Total Replies</h3>
          <div class="value">${formatNumber(totalReplies)}</div>
        </div>
        <div class="stat-box">
          <h3>Total Reposts</h3>
          <div class="value">${formatNumber(totalReposts)}</div>
        </div>
      </div>
      <div class="actions">
        <button id="downloadBtn" class="download-btn">Download CSV</button>
      </div>
      <div class="last-updated">Last Updated: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</div>
    `;

    // Add event listener after creating the button
    document.getElementById('downloadBtn').addEventListener('click', downloadCSV);

    // Display individual posts
    postsContainer.innerHTML = '';
    
    const sortedPosts = Object.entries(posts)
      .sort(([timestampA], [timestampB]) => new Date(timestampB) - new Date(timestampA))
      .map(([timestamp, post]) => post);

    sortedPosts.forEach(post => {
      const postElement = document.createElement('div');
      postElement.className = 'post-card';
      
      const formattedTime = new Date(post.timestamp).toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      postElement.innerHTML = `
        <div class="post-header">
          <strong class="author">@${post.author}</strong>
          <span class="timestamp">${formattedTime}</span>
        </div>
        <div class="post-content">${post.content}</div>
        <div class="post-stats">
          <div class="stat-item">${icons.like} ${formatNumber(post.likes || 0)}</div>
          <div class="stat-item">${icons.reply} ${formatNumber(post.replies || 0)}</div>
          <div class="stat-item">${icons.repost} ${formatNumber(post.reposts || 0)}</div>
          <div class="stat-item">${icons.share} ${formatNumber(post.shares || 0)}</div>
        </div>
      `;
      postsContainer.appendChild(postElement);
    });
  });
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

// Add this function to handle CSV creation and download
function downloadCSV() {
  chrome.storage.local.get(['threadsPosts'], function(result) {
    const posts = result.threadsPosts || {};
    
    // Create CSV headers
    const headers = ['Timestamp', 'Author', 'Content', 'Likes', 'Replies', 'Reposts', 'Shares'];
    
    // Convert posts data to CSV rows
    const rows = Object.values(posts).map(post => [
      post.timestamp,
      post.author,
      `"${post.content.replace(/"/g, '""')}"`, // Escape quotes in content
      post.likes,
      post.replies,
      post.reposts,
      post.shares
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `threads_stats_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// Load stats when page opens
displayStats();

// Refresh stats every 30 seconds
setInterval(displayStats, 30000); 