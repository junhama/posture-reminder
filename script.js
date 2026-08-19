// Posture Reminder App - V2
// - 設定のローカル保存 (localStorage)
// - 次の通知までのカウントダウン表示
// - 通知メッセージ / 通知音のカスタマイズ
// - 通知時間帯の制限 (深夜の通知を防止)
// - 今日の通知回数スタッツ
// - テスト通知 / サポーター登録

class PostureReminder {
    constructor() {
        this.intervalId = null;
        this.countdownId = null;
        this.nextFireAt = null;
        this.settings = this.loadSettings();

        // DOM elements
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.testBtn = document.getElementById('test-btn');
        this.intervalSelect = document.getElementById('interval');
        this.messageInput = document.getElementById('message');
        this.soundToggle = document.getElementById('sound-toggle');
        this.enabledCheckbox = document.getElementById('enabled');
        this.startTimeInput = document.getElementById('start-time');
        this.endTimeInput = document.getElementById('end-time');
        this.statusText = document.getElementById('status-text');
        this.statusEl = document.getElementById('status');
        this.statusDot = document.getElementById('status-dot');
        this.countdownEl = document.getElementById('countdown');
        this.countdownTime = document.getElementById('countdown-time');
        this.todayCountEl = document.getElementById('today-count');
        this.todayCountNum = document.getElementById('today-count-num');
        this.supporterBtn = document.getElementById('supporter-btn');
        this.supporterNote = document.getElementById('supporter-note');

        this.postureTips = [
            '背筋を伸ばして、肩をリラックスさせましょう',
            '画面と目を離して、遠くを見ましょう',
            '肩を回して、首のこりをほぐしましょう',
            '足を組まずに、両足を床につけましょう',
            'モニターの高さを目の高さに合わせましょう',
            '深呼吸して、リラックスしましょう',
            '猫背になっていませんか？背筋をピンと伸ばしましょう'
        ];

        // Bind event listeners
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.testBtn.addEventListener('click', () => this.sendTestNotification());

        this.intervalSelect.addEventListener('change', (e) => {
            this.settings.interval = parseInt(e.target.value, 10);
            this.saveSettings();
            if (this.intervalId) {
                this.startReminder(); // restart with new interval
            }
        });

        this.messageInput.addEventListener('change', (e) => {
            this.settings.message = e.target.value.trim() || this.postureTips[0];
            this.saveSettings();
        });

        this.soundToggle.addEventListener('change', (e) => {
            this.settings.sound = e.target.checked;
            this.saveSettings();
        });

        this.enabledCheckbox.addEventListener('change', (e) => {
            this.settings.enabled = e.target.checked;
            this.saveSettings();
            if (!this.settings.enabled && this.intervalId) {
                this.stop();
            } else if (this.settings.enabled && !this.intervalId) {
                this.start();
            }
        });

        this.startTimeInput.addEventListener('change', (e) => {
            this.settings.startTime = e.target.value;
            this.saveSettings();
            if (this.intervalId) this.startReminder();
        });

        this.endTimeInput.addEventListener('change', (e) => {
            this.settings.endTime = e.target.value;
            this.saveSettings();
            if (this.intervalId) this.startReminder();
        });

        this.supporterBtn.addEventListener('click', () => {
            this.settings.supporter = true;
            this.saveSettings();
            this.updateSupporterUI();
            this.showToast('🎉 サポーター登録ありがとうございます！');
        });

        // Restore settings into UI
        this.applySettingsToUI();

        // Initialize UI
        this.updateUI(false);
        this.updateSupporterUI();
        this.updateTodayCount();
    }

    loadSettings() {
        const defaults = {
            interval: 30,
            enabled: true,
            sound: true,
            message: '背筋を伸ばして、肩をリラックスさせましょう',
            startTime: '09:00',
            endTime: '22:00',
            supporter: false
        };
        try {
            const raw = localStorage.getItem('posture-reminder-settings-v2');
            if (raw) return Object.assign(defaults, JSON.parse(raw));
        } catch (e) { /* ignore corrupted storage */ }
        return defaults;
    }

    saveSettings() {
        try {
            localStorage.setItem('posture-reminder-settings-v2', JSON.stringify(this.settings));
        } catch (e) { /* storage unavailable */ }
    }

    applySettingsToUI() {
        this.intervalSelect.value = String(this.settings.interval);
        this.messageInput.value = this.settings.message;
        this.soundToggle.checked = this.settings.sound;
        this.enabledCheckbox.checked = this.settings.enabled;
        this.startTimeInput.value = this.settings.startTime;
        this.endTimeInput.value = this.settings.endTime;
    }

    start() {
        if (!this.settings.enabled) return;

        // Request permission for notifications if needed
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.startReminder();
                } else {
                    this.showToast('⚠️ 通知が許可されていません');
                }
            });
        } else if (Notification.permission === 'granted') {
            this.startReminder();
        } else {
            this.showToast('⚠️ 通知が許可されていません');
        }
    }

    startReminder() {
        // Clear any existing interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        if (this.countdownId) {
            clearInterval(this.countdownId);
        }

        // Show immediate notification
        this.fireNotification();

        // Set up interval for future notifications
        const intervalMs = this.settings.interval * 60 * 1000;
        this.nextFireAt = Date.now() + intervalMs;
        this.intervalId = setInterval(() => {
            this.fireNotification();
            this.nextFireAt = Date.now() + intervalMs;
        }, intervalMs);

        // Countdown display
        this.countdownId = setInterval(() => this.updateCountdown(), 1000);
        this.updateCountdown();

        this.updateUI(true);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.countdownId) {
            clearInterval(this.countdownId);
            this.countdownId = null;
        }
        this.nextFireAt = null;
        this.countdownEl.hidden = true;
        this.updateUI(false);
    }

    isWithinTimeWindow() {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const parse = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + (m || 0);
        };
        const start = parse(this.settings.startTime);
        const end = parse(this.settings.endTime);
        if (start === end) return true; // 常時通知
        if (start < end) return minutes >= start && minutes < end;
        // 深夜跨ぎ (例: 22:00〜09:00)
        return minutes >= start || minutes < end;
    }

    pickMessage() {
        const custom = (this.settings.message || '').trim();
        if (custom) return custom;
        return this.postureTips[Math.floor(Math.random() * this.postureTips.length)];
    }

    fireNotification() {
        if (!this.settings.enabled || Notification.permission !== 'granted') return;

        if (!this.isWithinTimeWindow()) {
            // 時間帯外は通知しない (次回は時間帯内で通知)
            return;
        }

        if (this.settings.sound) {
            this.playBeep();
        }

        this.incrementTodayCount();

        const notification = new Notification('姿勢をチェック！💺', {
            body: this.pickMessage(),
            icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💺</text></svg>',
            tag: 'posture-reminder',
            renotify: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }

    sendTestNotification() {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') this.fireNotification();
            });
        } else if (Notification.permission === 'granted') {
            this.fireNotification();
        } else {
            this.showToast('⚠️ 通知が許可されていません');
        }
    }

    playBeep() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = this._audioCtx || (this._audioCtx = new AudioCtx());
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.frequency.value = 880;
            oscillator.type = 'sine';
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.5);
        } catch (e) { /* audio unavailable */ }
    }

    incrementTodayCount() {
        const today = new Date().toDateString();
        let stats = { date: today, count: 0 };
        try {
            const raw = localStorage.getItem('posture-reminder-stats-v2');
            if (raw) {
                stats = JSON.parse(raw);
                if (stats.date !== today) {
                    stats = { date: today, count: 0 };
                }
            }
        } catch (e) { /* ignore */ }
        stats.count += 1;
        try {
            localStorage.setItem('posture-reminder-stats-v2', JSON.stringify(stats));
        } catch (e) { /* ignore */ }
        this.updateTodayCount();
    }

    updateTodayCount() {
        let count = 0;
        try {
            const raw = localStorage.getItem('posture-reminder-stats-v2');
            if (raw) {
                const stats = JSON.parse(raw);
                if (stats.date === new Date().toDateString()) {
                    count = stats.count;
                }
            }
        } catch (e) { /* ignore */ }
        if (this.todayCountNum) this.todayCountNum.textContent = count;
        if (this.todayCountEl) this.todayCountEl.hidden = false;
    }

    updateCountdown() {
        if (!this.nextFireAt) return;
        const remain = Math.max(0, Math.floor((this.nextFireAt - Date.now()) / 1000));
        const mm = String(Math.floor(remain / 60)).padStart(2, '0');
        const ss = String(remain % 60).padStart(2, '0');
        this.countdownTime.textContent = `${mm}:${ss}`;
        this.countdownEl.hidden = false;
        if (remain <= 0 && this.intervalId) {
            this.nextFireAt = Date.now() + this.settings.interval * 60 * 1000;
        }
    }

    updateSupporterUI() {
        if (this.supporterNote && this.supporterBtn) {
            this.supporterNote.hidden = !this.settings.supporter;
            this.supporterBtn.hidden = this.settings.supporter;
        }
    }

    showToast(message) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    }

    updateUI(isStarted = false) {
        const isRunning = !!this.intervalId;

        this.startBtn.disabled = isRunning || !this.settings.enabled;
        this.stopBtn.disabled = !isRunning;
        this.intervalSelect.disabled = isRunning;
        this.enabledCheckbox.checked = this.settings.enabled;
        this.messageInput.disabled = isRunning;
        this.startTimeInput.disabled = isRunning;
        this.endTimeInput.disabled = isRunning;

        if (this.statusText) {
            this.statusText.textContent = isRunning ? '動作中' : '停止中';
            this.statusEl.className = 'status ' + (isRunning ? 'success' : '');
            this.statusDot.className = 'status-dot ' + (isRunning ? 'on' : 'off');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.postureReminder = new PostureReminder();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .catch(() => {});
    }
});

// Also handle visibility change to pause/resume when tab is hidden
document.addEventListener('visibilitychange', () => {
    const app = window.postureReminder;
    if (!app) return;
    if (document.hidden) {
        // Pause when tab is hidden
        if (app.intervalId) {
            app.stop();
            app.wasPaused = true;
        }
    } else if (app.wasPaused) {
        // Resume when tab becomes visible again
        app.start();
        app.wasPaused = false;
    }
});
