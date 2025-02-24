import { icons } from './icons.js';

function displayStats() {
  chrome.storage.local.get(['threadsPosts'], function(result) {
    const posts = result.threadsPosts || {};
    const postsContainer = document.getElementById('posts');
    const summary = document.getElementById('summary');

    if (!postsContainer || !summary) return;

    const stats = calculateStats(posts);
    renderSummary(summary, stats);
    renderPosts(postsContainer, posts);
  });
}

function calculateStats(posts) {
  return {
    totalPosts: Object.keys(posts).length,
    totalLikes: Object.values(posts).reduce((sum, post) => sum + parseInt(post.likes || 0), 0),
    totalReplies: Object.values(posts).reduce((sum, post) => sum + parseInt(post.replies || 0), 0),
    totalReposts: Object.values(posts).reduce((sum, post) => sum + parseInt(post.reposts || 0), 0)
  };
}

function createStatBox(title, value) {
  const formattedValue = typeof value === 'number' ? formatNumber(value) : value;
  return `
    <div class="stat-box">
      <h3>${title}</h3>
      <div class="value">${formattedValue}</div>
    </div>
  `;
}

function createSummaryTemplate(stats, currentTime) {
  return `
    <div class="summary-stats">
      ${createStatBox('Total Posts', stats.totalPosts)}
      ${createStatBox('Total Likes', stats.totalLikes)}
      ${createStatBox('Total Replies', stats.totalReplies)}
      ${createStatBox('Total Reposts', stats.totalReposts)}
    </div>
    <div class="actions">
      <button id="downloadBtn" class="download-btn">Download CSV</button>
    </div>
    <div class="last-updated">Last Updated: ${currentTime}</div>
  `;
}

function createPostTemplate(post) {
  return `
    <div class="post-card">
      <div class="post-header">
        <strong class="author">@${post.author}</strong>
        <span class="timestamp">${formatDateTime(post.timestamp)}</span>
      </div>
      <div class="post-content">${post.content}</div>
      <div class="post-stats">
        ${createStatItem(icons.like, post.likes)}
        ${createStatItem(icons.reply, post.replies)}
        ${createStatItem(icons.repost, post.reposts)}
        ${createStatItem(icons.share, post.shares)}
      </div>
    </div>
  `;
}

function createStatItem(icon, value) {
  return `
    <div class="stat-item">
      ${icon} ${formatNumber(value || 0)}
    </div>
  `;
}

function renderSummary(summaryElement, stats) {
  const currentTime = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  summaryElement.innerHTML = createSummaryTemplate(stats, currentTime);
  document.getElementById('downloadBtn').addEventListener('click', downloadCSV);
}

function renderPosts(postsContainer, posts) {
  const sortedPosts = Object.entries(posts)
    .sort(([timestampA], [timestampB]) => new Date(timestampB) - new Date(timestampA))
    .map(([, post]) => post);

  postsContainer.innerHTML = sortedPosts.map(createPostTemplate).join('');
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function downloadCSV() {
  chrome.storage.local.get(['threadsPosts'], function(result) {
    const posts = result.threadsPosts || {};
    const currentTime = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const headers = ['Export_Time', 'Timestamp', 'Author', 'Content', 'Likes', 'Replies', 'Reposts', 'Shares'];
    
    const rows = Object.values(posts).map(post => [
      currentTime,
      post.timestamp,
      post.author,
      `"${post.content.replace(/"/g, '""')}"`,
      post.likes,
      post.replies,
      post.reposts,
      post.shares
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    downloadFile(csvContent);
  });
}

function downloadFile(content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `threads_stats_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

displayStats();
setInterval(displayStats, 30000); 