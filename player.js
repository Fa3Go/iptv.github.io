// 全域變數宣告
let player; // Video.js 播放器實例
let hls;    // HLS.js 實例，用於處理 m3u8 串流
// 新增 RWD 相關變數
const MOBILE_BREAKPOINT = 768; // 手機版斷點（像素）
let isMobile = window.innerWidth < MOBILE_BREAKPOINT;

// 初始化播放器和摺疊功能
document.addEventListener('DOMContentLoaded', function () {
    // 初始化播放器
    player = videojs('videoPlayer', {
        controls: true,// 顯示控制列
        fluid: true,// 自適應容器大小
        playbackRates: [0.25, 0.5, 1, 1.25, 1.5, 2],// 播放速度選項
        html5: {
            hls: {
                enableLowInitialPlaylist: true,
                smoothQualityChange: true,
                overrideNative: true
            }
        }
    });

    // 初始化摺疊功能
    initializeCollapse();

    // 初始化深色模式
    initializeDarkMode();

    // 初始化 RWD 功能
    initializeRWD();
});

// 摺疊功能初始化
function initializeCollapse() {
    const toggleBtn = document.querySelector('.toggle-btn');
    const playlistSection = document.querySelector('.playlist-section');
    const playerSection = document.querySelector('.player-section');

    // 設定初始狀態
    if (!isMobile) {
        playerSection.style.marginRight = '300px';
    }

    toggleBtn.addEventListener('click', function () {
        playlistSection.classList.toggle('collapsed');

        if (playlistSection.classList.contains('collapsed')) {
            playerSection.style.marginRight = '30px';
        } else {
            if (!isMobile) {
                playerSection.style.marginRight = '300px';
            }
        }

        // 重新計算播放器大小
        if (player) {
            setTimeout(() => {
                const playerHeight = isMobile ?
                    Math.min(window.innerHeight * 0.4, 300) : 500;
                player.dimensions(player.currentWidth(), playerHeight);
            }, 300);
        }
    });
}

function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const icon = darkModeToggle.querySelector('i');

    // 檢查本地儲存的主題設定
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateDarkModeIcon(icon, savedTheme === 'dark');
    }

    darkModeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateDarkModeIcon(icon, newTheme === 'dark');

        // 更新 Video.js 播放器主題
        if (player) {
            if (newTheme === 'dark') {
                player.addClass('vjs-theme-dark');
            } else {
                player.removeClass('vjs-theme-dark');
            }
        }
    });
}

function updateDarkModeIcon(icon, isDark) {
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

document.getElementById('fileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const content = e.target.result;
        const playlist = parseM3U(content);
        displayPlaylist(playlist);
    };

    reader.readAsText(file);
});

function parseM3U(content) {
    const lines = content.split('\n');
    const playlist = [];
    let currentItem = null;

    // 解析 M3U 檔案的每一行
    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            // 解析標題資訊（格式：#EXTINF:-1,標題）
            const titleMatch = line.match(/#EXTINF:.*,(.+)/);
            currentItem = {
                title: titleMatch ? titleMatch[1] : '未命名',
                url: ''
            };
        } else if (line && !line.startsWith('#')) {
            // 解析 URL 資訊
            if (currentItem) {
                currentItem.url = line;
                playlist.push(currentItem);
                currentItem = null;
            } else {
                // 如果沒有找到標題資訊，則將當前行作為標題
                playlist.push({
                    title: line,
                    url: line
                });
            }
        }
    });

    return playlist;
}

function loadVideo(url) {
    // 如果已存在 HLS 實例，先銷毀它
    if (hls) {
        hls.destroy();
    }

    // 檢查是否為 HLS 串流
    if (url.endsWith('.m3u8')) {
        if (Hls.isSupported()) {
            // 如果瀏覽器支援 HLS，則初始化 HLS.js
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(player.tech().el());
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                player.play();
            });
        }
        // 對於原生支援 HLS 的瀏覽器（如 Safari）
        else if (player.tech().el().canPlayType('application/vnd.apple.mpegurl')) {
            player.src({
                src: url,
                type: 'application/x-mpegURL'
            });
        }
    } else {
        // 處理一般影片檔案
        player.src({
            src: url,
            type: getVideoType(url)
        });
    }
}

// 根據檔案副檔名取得對應的 MIME 類型
function getVideoType(url) {
    const extension = url.split('.').pop().toLowerCase();
    const types = {
        'm3u8': 'application/x-mpegURL',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg'
    };
    return types[extension] || 'video/mp4';
}

// 顯示播放清單並處理點擊事件 
function displayPlaylist(playlist) {
    const playlistElement = document.getElementById('playlist');
    playlistElement.innerHTML = '';

    playlist.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = item.title;
        li.dataset.index = index;

        // 點擊播放清單項目時的處理
        li.onclick = function () {
            document.querySelectorAll('#playlist li').forEach(item => {
                item.classList.remove('active');
            });
            li.classList.add('active');
            loadVideo(item.url);

            // 在手機版點擊後自動收合播放清單
            if (isMobile) {
                const playlistSection = document.querySelector('.playlist-section');
                const playerSection = document.querySelector('.player-section');
                playlistSection.classList.add('collapsed');
                playerSection.style.marginRight = '30px';
            }
        };
        playlistElement.appendChild(li);
    });

    // 自動載入第一個項目
    if (playlist.length > 0) {
        loadVideo(playlist[0].url);
        playlistElement.firstChild.classList.add('active');
    }
}

// 新增影片結束時自動播放下一個的功能
player.on('ended', function () {
    const activeItem = document.querySelector('#playlist li.active');
    if (activeItem) {
        const nextItem = activeItem.nextElementSibling;
        if (nextItem) {
            nextItem.click();
        }
    }
});

// 新增 RWD 初始化函數
function initializeRWD() {
    const playlistSection = document.querySelector('.playlist-section');
    const playerSection = document.querySelector('.player-section');

    // 根據螢幕寬度設定初始狀態
    function updateLayout() {
        isMobile = window.innerWidth < MOBILE_BREAKPOINT;

        if (isMobile) {
            // 手機版自動收合播放清單
            playlistSection.classList.add('collapsed');
            playerSection.style.marginRight = '30px';

            // 調整播放器高度以適應手機螢幕
            const viewportHeight = window.innerHeight;
            const playerHeight = Math.min(viewportHeight * 0.4, 300); // 最大高度 300px
            player.dimensions('100%', playerHeight);
        } else {
            // 電腦版展開播放清單
            if (!playlistSection.classList.contains('collapsed')) {
                playerSection.style.marginRight = '300px';
            }

            // 重設播放器高度
            player.dimensions('100%', 500);
        }
    }

    // 監聽視窗大小變化
    window.addEventListener('resize', debounce(updateLayout, 250));

    // 初始執行一次
    updateLayout();
}

// 新增防抖動函數
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}