// 日志模块

let autoRefreshInterval = null;

// 加载日志日期列表
async function loadLogDates() {
    try {
        const authToken = localStorage.getItem('authToken');
        const res = await fetch('/admin/logs', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (data.success && data.data) {
            const select = document.getElementById('logDateSelect');
            // 保留当前选择
            const currentValue = select.value;

            select.innerHTML = '<option value="today">今日日志</option>';

            data.data.forEach(file => {
                const date = file.replace('.log', '');
                const option = document.createElement('option');
                option.value = date;
                option.textContent = date;
                select.appendChild(option);
            });

            // 恢复选择
            if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                select.value = currentValue;
            }
        }
    } catch (error) {
        console.error('加载日志日期失败:', error);
    }
}

// 加载日志内容
async function loadLogs() {
    const select = document.getElementById('logDateSelect');
    const logContent = document.getElementById('logContent');
    const date = select.value;

    try {
        const authToken = localStorage.getItem('authToken');
        const url = date === 'today' ? '/admin/logs/today' : `/admin/logs/${date}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (data.success) {
            if (data.data && data.data.length > 0) {
                // 渲染日志内容
                const html = data.data.map(line => {
                    const escaped = escapeHtml(line);
                    // 根据日志级别添加颜色类
                    let className = 'log-line';
                    if (line.includes('[ERROR]')) className += ' log-error';
                    else if (line.includes('[WARN]')) className += ' log-warn';
                    else if (line.includes('[INFO]')) className += ' log-info';
                    return `<div class="${className}">${escaped}</div>`;
                }).join('');
                logContent.innerHTML = `<div class="log-lines">${html}</div>`;
                // 滚动到底部
                logContent.scrollTop = logContent.scrollHeight;
            } else {
                logContent.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-text">${data.message || '暂无日志'}</div>
                    </div>
                `;
            }
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        logContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-text">加载失败: ${escapeHtml(error.message)}</div>
            </div>
        `;
    }
}

// 切换自动刷新
function toggleAutoRefresh() {
    const checkbox = document.getElementById('autoRefreshLogs');

    if (checkbox.checked) {
        // 启用自动刷新，每5秒刷新一次
        autoRefreshInterval = setInterval(() => {
            const logsPage = document.getElementById('logsPage');
            // 只在日志页面可见时刷新
            if (!logsPage.classList.contains('hidden')) {
                loadLogs();
            }
        }, 5000);
        showToast('已启用自动刷新��每5秒）', 'info');
    } else {
        // 禁用自动刷新
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        showToast('已关闭自动刷新', 'info');
    }
}
