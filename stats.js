function displayStats() {
  chrome.storage.local.get(['threadsPosts'], function(result) {
    console.log('Storage data:', result);  // Log entire result
    console.log('Posts data:', result.threadsPosts);  // Log just the posts
    
    const posts = result.threadsPosts || {};
    console.log('Number of posts:', Object.keys(posts).length);  // Log post count
    
    // Log a sample post if available
    if (Object.keys(posts).length > 0) {
      console.log('Sample post:', Object.values(posts)[0]);
    }

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
          <div>${totalPosts}</div>
        </div>
        <div class="stat-box">
          <h3>Total Likes</h3>
          <div>${totalLikes.toLocaleString()}</div>
        </div>
        <div class="stat-box">
          <h3>Total Replies</h3>
          <div>${totalReplies.toLocaleString()}</div>
        </div>
        <div class="stat-box">
          <h3>Total Reposts</h3>
          <div>${totalReposts.toLocaleString()}</div>
        </div>
      </div>
      <div class="last-updated">Last Updated: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</div>
    `;

    // Display individual posts
    postsContainer.innerHTML = '';
    
    // Sort posts by timestamp (newest first)
    const sortedPosts = Object.entries(posts)
      .sort(([timestampA], [timestampB]) => new Date(timestampB) - new Date(timestampA))
      .map(([timestamp, post]) => post);

    sortedPosts.forEach(post => {
      const postElement = document.createElement('div');
      postElement.className = 'post-card';
      
      // Format the timestamp to local time
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
          <div class="stat-item">👍 ${(post.likes || 0).toLocaleString()}</div>
          <div class="stat-item">💬 ${(post.replies || 0).toLocaleString()}</div>
          <div class="stat-item">🔄 ${(post.reposts || 0).toLocaleString()}</div>
          <div class="stat-item">📤 ${(post.shares || 0).toLocaleString()}</div>
        </div>
      `;
      postsContainer.appendChild(postElement);
    });
  });
}

// Load stats when page opens
displayStats();

// Refresh stats every 30 seconds
setInterval(displayStats, 30000); 