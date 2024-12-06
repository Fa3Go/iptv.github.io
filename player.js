// 全域變數宣告
let player; // Video.js 播放器實例
let hls;    // HLS.js 實例，用於處理 m3u8 串流
// 新增 RWD 相關變數
const MOBILE_BREAKPOINT = 768; // 手機版斷點（像素）
let isMobile = window.innerWidth < MOBILE_BREAKPOINT;

// 初始化播放器和摺疊功能
document.addEventListener('DOMContentLoaded', function () {
    // HLS 配置
    const hlsConfig = {
        enableHardwareAcceleration: true,    // 啟用硬體加速
        enableWorker: true,                  // 啟用 Web Worker
        lowLatencyMode: true,                // 低延遲模式
        backBufferLength: 90,                // 緩衝區長度（秒）
        maxBufferSize: 0,                    // 無限制緩衝區大小
        maxBufferLength: 30,                 // 最大緩衝時長（秒）
        maxMaxBufferLength: 600,             // 絕對最大緩衝時長（秒）
        startLevel: -1,                      // 自動選擇起始質量
        debug: false                         // 關閉除錯模式
    };

    // Video.js 播放器配置
    player = videojs('videoPlayer', {
        html5: {
            hls: {
                overrideNative: true,        // 覆蓋原生 HLS
                useMediaSource: true,         // 使用 Media Source Extensions
                enableLowInitialPlaylist: true,
                smoothQualityChange: true,
                allowSeeksWithinUnsafeLiveWindow: true,
                handleManifestRedirects: true,
                useBandwidthFromLocalStorage: true
            },
            vhs: {
                experimentalBufferBasedABR: true,    // 實驗性緩衝自適應碼率
                useDevicePixelRatio: true,          // 使用設備像素比
                useNetworkInformationType: true,     // 使用網路資訊
                useDtsForTimestampOffset: true,      // 使用 DTS 時間戳
                overrideNative: true,
                fastQualityChange: true
            }
        },
        controls: true,
        fluid: true,
        playbackRates: [0.5, 1, 1.5, 2],
        controlBar: {
            playToggle: {
                tooltip: 'Play/Pause'
            },
            volumePanel: {
                inline: false,
                volumeControl: {
                    tooltip: 'Volume'
                }
            },
            currentTimeDisplay: true,
            timeDivider: true,
            durationDisplay: true,
            remainingTimeDisplay: false,
            progressControl: {
                seekBar: {
                    tooltip: 'Seek'
                }
            },
            fullscreenToggle: {
                tooltip: 'Fullscreen'
            },
            playbackRateMenuButton: {
                tooltip: 'Playback Rate'
            }
        }
    });

    // 初始化摺疊功能
    initializeCollapse();

    // 初始化深色模式
    initializeDarkMode();

    // 初始化 RWD 功能
    initializeRWD();

    // 初始化 HLS
    function initHls(url) {
        if (Hls.isSupported()) {
            hls = new Hls(hlsConfig);
            hls.loadSource(url);
            hls.attachMedia(player.tech().el());

            // HLS 事件監聽
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                player.play();
            });

            // 錯誤處理
            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('Network error, trying to recover...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('Media error, trying to recover...');
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error('Unrecoverable error');
                            hls.destroy();
                            break;
                    }
                }
            });
        }
    }

    // 修改 loadVideo 函數
    function loadVideo(url) {
        if (hls) {
            hls.destroy();
        }

        if (url.endsWith('.m3u8')) {
            if (Hls.isSupported()) {
                initHls(url);
            } else if (player.tech().el().canPlayType('application/vnd.apple.mpegurl')) {
                player.src({
                    src: url,
                    type: 'application/x-mpegURL'
                });
            }
        } else {
            player.src({
                src: url,
                type: getVideoType(url)
            });
        }
    }

    // 初始化性能監控
    monitorPerformance();
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
    if (!file) {
        alert('Please select a file.');
        return;
    }

    if (!file.name.toLowerCase().endsWith('.m3u') &&
        !file.name.toLowerCase().endsWith('.m3u8')) {
        alert('Please select a valid M3U/M3U8 file.');
        return;
    }

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

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            const titleMatch = line.match(/#EXTINF:.*,(.+)/);
            currentItem = {
                title: titleMatch ? titleMatch[1] : 'Untitled',
                url: ''
            };
        } else if (line && !line.startsWith('#')) {
            if (currentItem) {
                currentItem.url = line;
                playlist.push(currentItem);
                currentItem = null;
            } else {
                playlist.push({
                    title: `Track ${playlist.length + 1}`,
                    url: line
                });
            }
        }
    });

    return playlist;
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
            const playerHeight = Math.min(viewportHeight * 0.4, 300); // 最大高�� 300px
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

// 錯誤處理訊息
function handleError(error) {
    console.error('Playback error:', error);
    // 可以加入使用者提示
    alert('Error playing the video. Please try another file or check the URL.');
}

// 播放器事件處理
player.on('error', function (error) {
    console.error('Video player error:', error);
    alert('Video playback error. Please try another video.');
});

// 當影片無法載入時的處理
function handleVideoLoadError(url) {
    console.error('Failed to load video:', url);
    alert('Unable to load the video. Please check the URL or try another video.');
}

// 播放清單項目格式化
function formatPlaylistItem(title, index) {
    return `${index + 1}. ${title}`;
}

// 當沒有播放內容時的預設訊息
function showEmptyPlaylistMessage() {
    const playlistElement = document.getElementById('playlist');
    const emptyMessage = document.createElement('li');
    emptyMessage.textContent = 'No items in playlist';
    emptyMessage.classList.add('empty-message');
    playlistElement.appendChild(emptyMessage);
}

// 新增性能監控
function monitorPerformance() {
    if (hls) {
        setInterval(() => {
            const stats = hls.stats;
            console.log('Buffer Length:', stats.bufferedLength);
            console.log('Dropped Frames:', stats.droppedFrames);
            console.log('Current Level:', hls.currentLevel);
        }, 5000);
    }
}
