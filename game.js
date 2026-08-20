const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score-display');
const levelEl = document.getElementById('level-display');
const meterEl = document.getElementById('bullet-meter');
const comboEl = document.getElementById('combo-display');
const hudHighScoreEl = document.getElementById('hud-high-score');
const hudNameDisplay = document.getElementById('hud-name-display');
const nicknameInput = document.getElementById('nickname-input');
nicknameInput.addEventListener('input', () => {
    nicknameInput.value = nicknameInput.value.replace(/[^a-zA-Z0-9֐-׿ _-]/g, '');
});
const startHighScoreEl = document.getElementById('start-high-score');
const endHighScoreEl = document.getElementById('end-high-score');
const finalScoreEl = document.getElementById('final-score');

const doubleScoreUI = document.getElementById('double-score-ui');
const frenzyUI = document.getElementById('frenzy-ui');

const startScreen = document.getElementById('start-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const tutorialScreen = document.getElementById('tutorial-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const tutBtn = document.getElementById('tut-btn');
const lbTableBody = document.getElementById('lb-table-body');
const adminTh = document.getElementById('admin-th');

const SCREENS = {
    start: startScreen,
    leaderboard: leaderboardScreen,
    tutorial: tutorialScreen,
    gameOver: gameOverScreen
};

function showScreen(name) {
    Object.keys(SCREENS).forEach(key => {
        SCREENS[key].classList.toggle('hidden', key !== name);
    });
}

const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+-/<>~ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω';
const fontSize = 20;
let columns = 0;
let drops = [];

let isAdmin = false;

const HEBREW_FINAL_LETTER_MAP = { 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ף': 'פ', 'ך': 'כ' };
const BANNED_WORDS_EN = [
    'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'bastard',
    'whore', 'slut', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'cock',
    'twat', 'wanker', 'motherfucker', 'douchebag', 'skank', 'cum', 'jerkoff',
    'dumbass', 'pornhub', 'rapist'
];
const BANNED_WORDS_HE = [
    'זונה', 'זין', 'כוס', 'מניאק', 'שרמוטה', 'שרמוט', 'חרא', 'מזדיין', 'מזדיינת',
    'קוקסינל', 'כלבה', 'זובי', 'מפגר', 'בןזונה', 'לזיין', 'תזדיין'
];

function normalizeForFilter(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .split('').map(c => HEBREW_FINAL_LETTER_MAP[c] || c).join('')
        .replace(/[^a-z0-9֐-׿]/g, '')
        .replace(/(.)\1{2,}/g, '$1$1');
}

function containsProfanity(str) {
    const normalized = normalizeForFilter(str);
    if (!normalized) return false;
    return BANNED_WORDS_EN.some(w => normalized.includes(w)) ||
           BANNED_WORDS_HE.some(w => normalized.includes(w));
}

let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'zap') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'freeze') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(1300, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
    } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'error' || type === 'emp') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'bomb') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.8);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
    } else if (type === 'over') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.4);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    }
}

function triggerVibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

let playerData = { playerToken: '', nickname: '', highScore: 0, highScoreLevel: 1, hasSeenTut: false, isAdminDevice: false, lastSeenChatAt: null };

function loadSavedProfile() {
    const saved = localStorage.getItem('matrix_runner_profile');
    if (saved) {
        try {
            playerData = { ...playerData, ...JSON.parse(saved) };
            if (playerData.nickname) {
                nicknameInput.value = playerData.nickname;
                hudNameDisplay.innerText = playerData.nickname.toUpperCase();
            }
            if (playerData.isAdminDevice) {
                isAdmin = true;
            }
        } catch(e){}
    }

    if (!playerData.playerToken) {
        playerData.playerToken = 'tok_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem('matrix_runner_profile', JSON.stringify(playerData));
    }

    if (!playerData.lastSeenChatAt) {
        playerData.lastSeenChatAt = new Date().toISOString();
        localStorage.setItem('matrix_runner_profile', JSON.stringify(playerData));
    }

    updateHighScoreDisplay();
}

function updateHighScoreDisplay() {
    hudHighScoreEl.innerText = playerData.highScore;
    startHighScoreEl.innerText = `PERSONAL BEST: ${playerData.highScore}`;
    endHighScoreEl.innerText = `PERSONAL BEST: ${playerData.highScore}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showLeaderboardSkeleton() {
    lbTableBody.innerHTML = Array.from({ length: 6 }).map(() => `
        <tr class="skeleton-row">
            <td><span class="skeleton-bar" style="width:20px;"></span></td>
            <td><span class="skeleton-bar" style="width:70px;"></span></td>
            <td><span class="skeleton-bar" style="width:40px;"></span></td>
        </tr>
    `).join('');
}

async function fetchGlobalLeaderboard() {
    showLeaderboardSkeleton();
    if (isAdmin) {
        adminTh.classList.remove('hidden');
    } else {
        adminTh.classList.add('hidden');
    }

    try {
        const { data, error } = await db
            .from('leaderboard')
            .select('player_token, nickname, score')
            .order('score', { ascending: false })
            .limit(20);

        if (error) throw error;
        renderLeaderboardTable(data);
    } catch (err) {
        console.error('Leaderboard Fetch Error:', err);
        lbTableBody.innerHTML = `<tr><td colspan="4" style="color: #f00; padding: 20px;">FAILED TO CONNECT TO GRID</td></tr>`;
    }
}

async function submitScoreToBackend(newScore, currentLevel) {
    const nickname = nicknameInput.value.trim().toUpperCase() || 'ANONYMOUS';
    playerData.nickname = nickname;
    hudNameDisplay.innerText = nickname;

    if (newScore > playerData.highScore) {
        playerData.highScore = newScore;
        playerData.highScoreLevel = currentLevel;
    }

    try {
        const { data: existing, error: fetchError } = await db
            .from('leaderboard')
            .select('score, level')
            .eq('player_token', playerData.playerToken)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing && existing.score > playerData.highScore) {
            playerData.highScore = existing.score;
            playerData.highScoreLevel = existing.level || playerData.highScoreLevel;
        }
    } catch (e) {
        console.error('Leaderboard Sync Check Error (Non-Fatal):', e);
    }

    localStorage.setItem('matrix_runner_profile', JSON.stringify(playerData));
    updateHighScoreDisplay();

    try {
        const { error } = await db
            .from('leaderboard')
            .upsert([{
                player_token: playerData.playerToken,
                nickname: nickname,
                score: playerData.highScore,
                level: playerData.highScoreLevel
            }], { onConflict: ['player_token'] });

        if (error) {
            console.error('Score Submission Error (Non-Fatal):', error.message);
        }
    } catch (e) {
        console.error('Score Submission Exception:', e);
    }
}

async function deleteOperator(tokenOrName) {
    if (!isAdmin) return;
    if (!confirm(`Purge operative from the system grid?`)) return;

    try {
        const { error } = await db
            .from('leaderboard')
            .delete()
            .eq('player_token', tokenOrName);

        if (error) throw error;
        fetchGlobalLeaderboard();
    } catch (err) {
        alert('Failed to remove operative.');
        console.error(err);
    }
}

function renderLeaderboardTable(scores) {
    lbTableBody.innerHTML = '';
    if (!Array.isArray(scores) || scores.length === 0) {
        lbTableBody.innerHTML = `<tr><td colspan="4" style="color: #666; padding: 20px;">NO RECORDS FOUND</td></tr>`;
        return;
    }

    scores.forEach((entry, index) => {
        const rankEmojis = ['👑', '🥈', '🥉', '4️⃣', '5️⃣'];
        const row = document.createElement('tr');
        const safeNickname = escapeHtml(entry.nickname || 'ANONYMOUS');

        let html = `
            <td>${rankEmojis[index] || (index + 1)}</td>
            <td>${safeNickname}</td>
            <td>${Number(entry.score) || 0}</td>
        `;

        if (isAdmin) {
            html += `<td><button class="btn btn-danger" data-token="${escapeHtml(entry.player_token)}">PURGE</button></td>`;
        }

        row.innerHTML = html;
        lbTableBody.appendChild(row);
    });
}

lbTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-danger');
    if (!btn) return;
    const token = btn.dataset.token;
    if (token) deleteOperator(token);
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = Array(columns).fill(0).map(() => Math.floor(Math.random() * (canvas.height / fontSize)));
}
resizeCanvas();

let isPlaying = false;
let score = 0;
let level = 1;
let combo = 1;
let glitchesCleared = 0;
let bulletTimeEnergy = 100;
let isBulletTime = false;

let freezeTimer = 0;
let doubleScoreTimer = 0;
let frenzyTimer = 0;

let activeTouches = 0;
let isPressing = false;
let pressTimer = null;
let touchPos = { x: 0, y: 0 };
let shockwaveRadius = 0;

let glitches = [];
let particles = [];
let spawnTimer = 0;

class Particle {
    constructor(x, y, char, color) {
        this.x = x;
        this.y = y;
        this.char = char;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12 - 2;
        this.alpha = 1;
        this.size = fontSize * (Math.random() * 0.5 + 1.1);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.025;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.font = this.size + 'px monospace';
        ctx.fillText(this.char, this.x, this.y);
        ctx.restore();
    }
}

class GlitchTarget {
    constructor(xOverride, yOverride, typeOverride, vxOverride) {
        this.col = Math.floor(Math.random() * columns);
        this.x = xOverride !== undefined ? xOverride : this.col * fontSize;
        this.y = yOverride !== undefined ? yOverride : -30;
        this.vx = vxOverride || 0;
        this.baseSpeed = 1.0 + (level * 0.22);
        this.char = chars.charAt(Math.floor(Math.random() * chars.length));
        this.hp = 1;
        this.isParabolic = false;

        const rand = Math.random();
        if (typeOverride) {
            this.type = typeOverride;
        } else if (rand > 0.95 && level >= 2) {
            this.type = 'fatal_bomb';
        } else if (rand > 0.91 && level >= 2) {
            this.type = 'emp_bomb';
        } else if (rand > 0.88) {
            this.type = 'frenzy';
        } else if (rand > 0.84) {
            this.type = 'double_score';
        } else if (rand > 0.77 && level >= 3) {
            this.type = 'shielded';
            this.hp = 3;
        } else if (rand > 0.65) {
            this.type = 'decoy';
        } else if (rand > 0.55) {
            this.type = 'gold';
        } else if (rand > 0.45 && level >= 8) { // Blue freeze-time obstacle unlocked at level 8+
            this.type = 'blue';
        } else if (rand > 0.35) {
            this.type = 'purple';
        } else {
            this.type = 'red';
        }

        this.colorMap = {
            red: '#f00',
            blue: '#00ffff',
            gold: '#ffd700',
            purple: '#a020f0',
            shielded: '#ff00aa',
            decoy: '#ffffff',
            fatal_bomb: '#ff0000',
            emp_bomb: '#ffff00',
            double_score: '#ff8800',
            frenzy: '#ff00ff'
        };

        if (this.type === 'double_score') this.char = '2x';
        if (this.type === 'frenzy') this.char = '★';
    }

    update(speedMult, allGlitches) {
        if (freezeTimer > 0) return;

        if (this.isParabolic) {
            this.vy += this.gravity * speedMult;
            this.x += this.vx * speedMult;
            this.y += this.vy * speedMult;
        } else {
            this.y += this.baseSpeed * speedMult;
            this.x += this.vx * speedMult;
        }

        if (allGlitches && !this.isParabolic) {
            for (let other of allGlitches) {
                if (other === this || other.isParabolic) continue;
                let dx = this.x - other.x;
                let dy = this.y - other.y;
                let dist = Math.hypot(dx, dy);

                let minDist = (this.type === 'shielded' || other.type === 'shielded') ? 45 : 35;
                if (dist < minDist && dist > 0) {
                    this.x += dx > 0 ? 0.8 : -0.8;
                }
            }
        }

        if (this.x <= 15) {
            this.x = 15;
            this.vx = Math.abs(this.vx);
        } else if (this.x >= canvas.width - 25) {
            this.x = canvas.width - 25;
            this.vx = -Math.abs(this.vx);
        }

        const fixedTypes = ['fatal_bomb', 'emp_bomb', 'double_score', 'frenzy'];
        if (!fixedTypes.includes(this.type) && Math.random() > 0.85) {
            this.char = chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }

    draw(ctx) {
        ctx.save();
        const isClean = this.type === 'decoy';
        const isBomb = this.type === 'fatal_bomb' || this.type === 'emp_bomb';

        let color = this.colorMap[this.type];

        if (isBulletTime && !isClean && !isBomb && this.type !== 'double_score' && this.type !== 'frenzy') {
            color = '#00ffff';
        }

        if (this.type === 'fatal_bomb') {
            const pulse = Math.abs(Math.sin(Date.now() / 150));
            ctx.font = '28px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.shadowBlur = 10 + (pulse * 15);
            ctx.shadowColor = color;

            ctx.fillText('💣', this.x, this.y - 4);

            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = color;
            ctx.fillText('☠', this.x + 16, this.y - 12);

            ctx.restore();
            return;
        }

        if (this.type === 'emp_bomb') {
            const pulse = Math.abs(Math.sin(Date.now() / 150));
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 + pulse * 0.4})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00ffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y - 8, 20 + pulse * 6, 0, Math.PI * 2);
            ctx.stroke();

            ctx.font = '30px sans-serif';
            ctx.shadowBlur = 10 + (pulse * 15);
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.fillText('⚡', this.x, this.y - 8);

            ctx.restore();
            return;
        }

        let currentFontSize = fontSize + 8;
        if (this.type === 'shielded') currentFontSize += 8;
        if (this.type === 'double_score') currentFontSize -= 4;

        ctx.font = 'bold ' + currentFontSize + 'px monospace';

        if (this.type === 'shielded') {
            ctx.lineWidth = 2;
            for (let i = 0; i < this.hp; i++) {
                ctx.beginPath();
                ctx.arc(this.x + 8, this.y - 8, 22 + (i * 8), 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 0, 170, ${0.5 + i * 0.2})`;
                ctx.stroke();
            }
        }

        if (this.type === 'frenzy') {
            const pulse = Math.abs(Math.sin(Date.now() / 120));
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(255, 0, 255, ${0.5 + pulse * 0.4})`;
            ctx.beginPath();
            ctx.arc(this.x + 8, this.y - 8, 24 + pulse * 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (isClean) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(this.x - 4, this.y - 24, 25, 30);
        }

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(this.char, this.x, this.y);

        ctx.fillStyle = color;
        ctx.shadowBlur = (isBulletTime && !isClean) ? 25 : 18;
        ctx.shadowColor = color;
        ctx.fillText(this.char, this.x, this.y);
        ctx.restore();
    }
}

function triggerExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const char = chars.charAt(Math.floor(Math.random() * chars.length));
        particles.push(new Particle(x, y, char, color));
    }
}

function spawnGlitches() {
    spawnTimer++;
    const spawnInterval = Math.max(18, 65 - (level * 5));
    if (spawnTimer > (isBulletTime ? spawnInterval * 2.5 : spawnInterval)) {
        glitches.push(new GlitchTarget());
        spawnTimer = 0;
    }
}

function gameLoop() {
    ctx.fillStyle = isBulletTime ? 'rgba(0, 15, 10, 0.3)' : 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const boundaryY = canvas.height - 40;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f00';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, boundaryY);
    ctx.lineTo(canvas.width, boundaryY);
    ctx.stroke();
    ctx.restore();

    if (freezeTimer > 0) freezeTimer--;

    if (doubleScoreTimer > 0) {
        doubleScoreTimer--;
        doubleScoreUI.style.opacity = doubleScoreTimer > 60 ? '1' : (doubleScoreTimer % 10 < 5 ? '1' : '0');
    } else {
        doubleScoreUI.style.opacity = '0';
    }

    if (frenzyTimer > 0) {
        frenzyTimer--;
        frenzyUI.style.opacity = '1';
        if (frenzyTimer % 10 === 0) {
            let t = new GlitchTarget(undefined, undefined, 'red');
            t.isParabolic = true;
            t.x = Math.random() < 0.5 ? -20 : canvas.width + 20;
            t.y = canvas.height - (Math.random() * 200 + 100);
            t.vx = (t.x < 0 ? 1 : -1) * (Math.random() * 4 + 3);
            t.vy = -(Math.random() * 7 + 8);
            t.gravity = 0.15;
            glitches.push(t);
        }
    } else {
        frenzyUI.style.opacity = '0';
    }

    if (isPlaying) {
        if (isBulletTime) {
            bulletTimeEnergy = Math.max(0, bulletTimeEnergy - 0.7);
            if (bulletTimeEnergy === 0) deactivateBulletTime();
        } else {
            bulletTimeEnergy = Math.min(100, bulletTimeEnergy + 0.15);
        }
        meterEl.style.width = bulletTimeEnergy + '%';
        meterEl.style.background = isBulletTime ? '#00ffff' : '#0f0';
    }

    ctx.font = fontSize + 'px monospace';
    const speedMult = freezeTimer > 0 ? 0 : (isBulletTime ? 0.15 : 1.0);
    const bgSpeedMult = speedMult * 0.15;

    for (let i = 0; i < drops.length; i++) {
        const char = chars.charAt(Math.floor(Math.random() * chars.length));
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillStyle = isBulletTime ? 'rgba(0, 80, 80, 0.3)' : 'rgba(0, 160, 40, 0.28)';
        ctx.fillText(char, x, y);

        drops[i] += bgSpeedMult;
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.985) {
            drops[i] = 0;
        }
    }

    if (isPlaying) {
        if (frenzyTimer === 0) spawnGlitches();

        for (let i = glitches.length - 1; i >= 0; i--) {
            const g = glitches[i];
            g.update(speedMult, glitches);
            g.draw(ctx);

            if (g.y > boundaryY) {
                const safeToMiss = ['decoy', 'fatal_bomb', 'emp_bomb', 'double_score', 'frenzy'];

                if (safeToMiss.includes(g.type) || g.isParabolic) {
                    glitches.splice(i, 1);
                } else {
                    endGame();
                    break;
                }
            }
        }

        if (isBulletTime && activeTouches > 0) {
            shockwaveRadius = (shockwaveRadius + 8) % 180;
            ctx.save();
            ctx.beginPath();
            ctx.arc(touchPos.x, touchPos.y, shockwaveRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${1 - shockwaveRadius / 180})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(gameLoop);
}

function processTap(pt) {
    initAudio();
    let hit = false;

    for (let i = glitches.length - 1; i >= 0; i--) {
        const g = glitches[i];
        let hitRadius = g.type === 'shielded' ? 55 : 45;
        const dist = Math.hypot(g.x - pt.x, g.y - pt.y);

        if (dist < hitRadius) {
            hit = true;

            if (g.type === 'fatal_bomb') {
                playSound('bomb');
                triggerExplosion(g.x, g.y, '#f00');
                triggerVibrate([100, 100, 100]);
                endGame();
                return;
            }

            if (g.type === 'emp_bomb') {
                playSound('emp');
                triggerExplosion(g.x, g.y, '#ff0');
                triggerVibrate([100, 50]);
                bulletTimeEnergy = 0;
                combo = 1;
                deactivateBulletTime();
                glitches.splice(i, 1);
                showComboText("SYSTEM DRAINED!", '#ff0');
                break;
            }

            if (g.type === 'decoy') {
                combo = 1;
                bulletTimeEnergy = Math.max(0, bulletTimeEnergy - 30);
                playSound('error');
                triggerExplosion(g.x, g.y, '#fff');
                triggerVibrate([50, 50]);
                glitches.splice(i, 1);
                showComboText("COMBO BROKEN!", '#f00');
                break;
            }

            if (g.type === 'double_score') {
                playSound('powerup');
                doubleScoreTimer = 600;
                triggerExplosion(g.x, g.y, '#ff8800');
                glitches.splice(i, 1);
                break;
            }

            if (g.type === 'frenzy') {
                playSound('powerup');
                frenzyTimer = 300;
                triggerExplosion(g.x, g.y, '#ff00ff');
                glitches.splice(i, 1);
                break;
            }

            if (g.type === 'shielded') {
                g.hp--;
                triggerExplosion(g.x, g.y, g.colorMap[g.type]);
                playSound('zap');
                triggerVibrate(15);
                if (g.hp > 0) break;
            }

            triggerVibrate(30);
            triggerExplosion(g.x, g.y, g.colorMap[g.type]);

            if (g.type === 'blue') {
                freezeTimer = 60;
                playSound('freeze');
            } else if (g.type === 'gold') {
                bulletTimeEnergy = Math.min(100, bulletTimeEnergy + 40);
                playSound('zap');
            } else if (g.type === 'purple') {
                playSound('zap');
                glitches.push(new GlitchTarget(g.x - 20, g.y - 10, 'red', -2.5));
                glitches.push(new GlitchTarget(g.x + 20, g.y - 10, 'red', 2.5));
            } else {
                playSound('zap');
            }

            glitches.splice(i, 1);

            let points = 10 * combo * (isBulletTime ? 2 : 1) * (g.type === 'shielded' ? 5 : 1);
            if (doubleScoreTimer > 0) points *= 2;

            score += points;
            combo++;
            glitchesCleared++;

            if (score > playerData.highScore) {
                playerData.highScore = score;
                playerData.highScoreLevel = level;
                hudHighScoreEl.innerText = score;
            }

            if (combo > 2) {
                showComboText(`COMBO x${combo}!`, '#ff0');
            }

            scoreEl.innerText = `SCORE: ${score}`;

            if (glitchesCleared >= level * 6) {
                level++;
                glitchesCleared = 0;
                levelEl.innerText = `LEVEL: ${level}`;
            }
            break;
        }
    }

    if (!hit) {
        combo = 1;
        if (!isBulletTime && !isPressing) {
            isPressing = true;
            touchPos = pt;
            pressTimer = setTimeout(() => {
                if (isPressing && bulletTimeEnergy > 15 && activeTouches > 0) {
                    activateBulletTime();
                }
            }, 160);
        }
    }
}

function showComboText(text, color) {
    comboEl.innerText = text;
    comboEl.style.color = color;
    comboEl.style.opacity = '1';
    setTimeout(() => {
        comboEl.style.opacity = '0';
    }, 800);
}

function handlePointerUp() {
    isPressing = false;
    clearTimeout(pressTimer);
    if (isBulletTime && activeTouches === 0) deactivateBulletTime();
}

function activateBulletTime() {
    isBulletTime = true;
    shockwaveRadius = 0;
    triggerVibrate([30, 30]);
}

function deactivateBulletTime() {
    isBulletTime = false;
}

let isSubmittingPlay = false;
async function onPlayClicked() {
    if (isSubmittingPlay) return;
    isSubmittingPlay = true;
    try {
        await onPlayClickedInner();
    } finally {
        isSubmittingPlay = false;
    }
}

async function onPlayClickedInner() {
    initAudio();
    const nick = nicknameInput.value.trim().toUpperCase();

    if(!nick) {
        nicknameInput.style.borderColor = '#ff0000';
        setTimeout(() => nicknameInput.style.borderColor = '#0f0', 500);
        return;
    }

    if (containsProfanity(nick)) {
        nicknameInput.style.borderColor = '#ff0000';
        setTimeout(() => nicknameInput.style.borderColor = '#0f0', 800);
        alert('Nickname rejected: choose an appropriate name.');
        return;
    }

    if (nick === 'LIR') {
        if (playerData.isAdminDevice) {
            isAdmin = true;
        } else {
            const pass = prompt('Enter Admin Password:');
            if (pass === '123456') {
                isAdmin = true;
                playerData.isAdminDevice = true;
                localStorage.setItem('matrix_runner_profile', JSON.stringify(playerData));
            } else {
                alert('ACCESS DENIED: Incorrect Admin Password.');
                isAdmin = false;
                return;
            }
        }
    } else {
        isAdmin = false;
        playerData.isAdminDevice = false;

        try {
            const { data, error } = await db
                .from('leaderboard')
                .select('player_token, score, level')
                .eq('nickname', nick)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                if (data.player_token !== playerData.playerToken) {
                    alert(`The operator name "${nick}" is already registered by another user! Please choose a different nickname.`);
                    nicknameInput.style.borderColor = '#ff0000';
                    setTimeout(() => nicknameInput.style.borderColor = '#0f0', 800);
                    return;
                } else {
                    if (data.score > playerData.highScore) {
                        playerData.highScore = data.score;
                        playerData.highScoreLevel = data.level || 1;
                        updateHighScoreDisplay();
                    }
                }
            } else if (playerData.nickname && playerData.nickname !== nick) {
                playerData.playerToken = 'tok_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
                playerData.highScore = 0;
                playerData.highScoreLevel = 1;
                updateHighScoreDisplay();
            }
        } catch (err) {
            console.error('Nickname availability check error:', err);
        }

        localStorage.setItem('matrix_runner_profile', JSON.stringify(playerData));
    }

    if (!playerData.hasSeenTut) {
        showScreen('tutorial');
    } else {
        beginActualGame();
    }
}

function startFromTutorial() {
    initAudio();
    playerData.hasSeenTut = true;
    localStorage.setItem('matrix_runner_profile', JSON.stringify(playerData));
    beginActualGame();
}

function beginActualGame() {
    initAudio();
    score = 0;
    level = 1;
    combo = 1;
    glitchesCleared = 0;
    bulletTimeEnergy = 100;
    freezeTimer = 0;
    doubleScoreTimer = 0;
    frenzyTimer = 0;
    glitches = [];
    particles = [];
    activeTouches = 0;

    scoreEl.innerText = 'SCORE: 0';
    levelEl.innerText = 'LEVEL: 1';
    hudHighScoreEl.innerText = playerData.highScore;
    hudNameDisplay.innerText = (nicknameInput.value || 'OPERATOR').toUpperCase();

    showScreen(null);
    isPlaying = true;
}

function endGame() {
    isPlaying = false;
    deactivateBulletTime();
    playSound('over');
    triggerVibrate([100, 50, 100]);

    document.getElementById('end-stats').innerText = `REACHED LEVEL ${level}`;
    finalScoreEl.innerText = score;
    showScreen('gameOver');

    submitScoreToBackend(score, level);
}

document.getElementById('start-btn').addEventListener('click', onPlayClicked);
document.getElementById('restart-btn').addEventListener('click', beginActualGame);
tutBtn.addEventListener('click', startFromTutorial);

document.getElementById('open-lb-btn').addEventListener('click', () => {
    initAudio();
    showScreen('leaderboard');
    fetchGlobalLeaderboard();
});

document.getElementById('end-lb-btn').addEventListener('click', () => {
    initAudio();
    showScreen('leaderboard');
    fetchGlobalLeaderboard();
});

document.getElementById('close-lb-btn').addEventListener('click', () => {
    initAudio();
    showScreen(isPlaying ? null : 'start');
});

window.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.btn')) return;
    if (!isPlaying) return;
    activeTouches = 1;
    processTap({ x: e.clientX, y: e.clientY });
});

window.addEventListener('mouseup', () => {
    activeTouches = 0;
    handlePointerUp();
});

window.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.btn')) return;
    if (!isPlaying) return;
    e.preventDefault();

    activeTouches = e.touches.length;

    for (let i = 0; i < e.changedTouches.length; i++) {
        processTap({ x: e.changedTouches[i].clientX, y: e.changedTouches[i].clientY });
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.btn')) return;
    activeTouches = e.touches.length;
    if (activeTouches === 0) {
        handlePointerUp();
    }
});

window.addEventListener('resize', resizeCanvas);

loadSavedProfile();
gameLoop();
showScreen('start');
