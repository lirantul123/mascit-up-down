const chatScreen = document.getElementById('chat-screen');
const chatMessagesEl = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatBadgeStart = document.getElementById('chat-badge-start');
const chatBadgeEnd = document.getElementById('chat-badge-end');

SCREENS.chat = chatScreen;

let chatPollInterval = null;
let chatUnreadPollInterval = null;
let chatChannel = null;
let cachedChatMessages = [];
let unreadCount = 0;
let recentlySentAt = 0;

const CHAT_SEND_COOLDOWN_MS = 2000;
const CHAT_RECONCILE_POLL_MS = 15000;
const CHAT_UNREAD_POLL_MS = 20000;

function formatChatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateChatBadges(count) {
    [chatBadgeStart, chatBadgeEnd].forEach(el => {
        if (!el) return;
        if (count > 0) {
            el.textContent = count > 99 ? '99+' : String(count);
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

function markChatSeen() {
    playerData.lastSeenChatAt = new Date().toISOString();
    localStorage.setItem('matrix_runner_profile', JSON.stringify(playerData));
    unreadCount = 0;
    updateChatBadges(0);
}

function showChatSkeleton() {
    chatMessagesEl.innerHTML = Array.from({ length: 5 }).map((_, i) =>
        `<div class="chat-skeleton-line" style="width:${60 + (i % 3) * 12}%;"></div>`
    ).join('');
}

function renderChatMessages(messages) {
    const wasAtBottom = chatMessagesEl.scrollTop + chatMessagesEl.clientHeight >= chatMessagesEl.scrollHeight - 20;
    chatMessagesEl.innerHTML = messages.map(m => {
        const safeNick = escapeHtml(m.nickname || 'ANONYMOUS');
        const safeMsg = escapeHtml(m.message || '');
        const time = formatChatTime(m.created_at);
        const delBtn = (isAdmin && m.id != null)
            ? `<button class="btn btn-danger chat-del-btn" data-id="${m.id}">X</button>`
            : '';
        return `<div class="chat-msg">
            <div class="chat-msg-row">
                <span class="chat-msg-text"><span class="chat-nick">${safeNick}:</span> ${safeMsg}</span>
                ${delBtn}
            </div>
            <span class="chat-time">${time}</span>
        </div>`;
    }).join('') || `<div class="chat-msg" style="color:#666;">NO MESSAGES YET. SAY HI.</div>`;
    if (wasAtBottom) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

async function fetchChatMessages() {
    try {
        const { data, error } = await db
            .from('chat_messages')
            .select('id, nickname, message, created_at')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        cachedChatMessages = (data || []).slice().reverse();
        renderChatMessages(cachedChatMessages);
        markChatSeen();
    } catch (err) {
        console.error('Chat Fetch Error:', err);
        chatMessagesEl.innerHTML = `<div class="chat-msg" style="color:#f00;">FAILED TO CONNECT TO GRID CHAT</div>`;
    }
}

async function fetchUnreadChatCount() {
    if (!chatScreen.classList.contains('hidden')) return;
    try {
        const since = playerData.lastSeenChatAt || new Date(0).toISOString();
        const { count, error } = await db
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .gt('created_at', since);

        if (error) throw error;
        unreadCount = count || 0;
        updateChatBadges(unreadCount);
    } catch (err) {
        console.error('Unread Chat Count Error:', err);
    }
}

function appendLocalMessage(msg) {
    cachedChatMessages.push(msg);
    if (cachedChatMessages.length > 50) cachedChatMessages.shift();
    renderChatMessages(cachedChatMessages);
    markChatSeen();
}

async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message || chatSendBtn.disabled) return;

    if (containsProfanity(message)) {
        alert('Message rejected: keep it clean.');
        return;
    }

    const nickname = (playerData.nickname || nicknameInput.value.trim().toUpperCase() || 'ANONYMOUS');
    if (containsProfanity(nickname)) {
        alert('Set a clean nickname on the start screen before chatting.');
        return;
    }

    chatInput.value = '';
    chatSendBtn.disabled = true;
    const originalLabel = chatSendBtn.textContent;

    try {
        const { error } = await db
            .from('chat_messages')
            .insert([{ nickname, message }]);
        if (error) throw error;

        recentlySentAt = Date.now();
        appendLocalMessage({ id: null, nickname, message, created_at: new Date().toISOString() });
    } catch (err) {
        console.error('Chat Send Error:', err);
        alert('Failed to send message.');
    }

    let remainingMs = CHAT_SEND_COOLDOWN_MS;
    chatSendBtn.textContent = Math.ceil(remainingMs / 1000) + 's';
    const cooldownTimer = setInterval(() => {
        remainingMs -= 250;
        if (remainingMs <= 0) {
            clearInterval(cooldownTimer);
            chatSendBtn.disabled = false;
            chatSendBtn.textContent = originalLabel;
        } else {
            chatSendBtn.textContent = Math.ceil(remainingMs / 1000) + 's';
        }
    }, 250);
}

async function deleteChatMessage(id) {
    if (!isAdmin) return;
    if (!confirm('Purge this message from the grid?')) return;

    try {
        const { error } = await db
            .from('chat_messages')
            .delete()
            .eq('id', id);
        if (error) throw error;
        cachedChatMessages = cachedChatMessages.filter(m => m.id !== Number(id));
        renderChatMessages(cachedChatMessages);
    } catch (err) {
        alert('Failed to remove message.');
        console.error(err);
    }
}

chatMessagesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.chat-del-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    if (id) deleteChatMessage(id);
});

function subscribeChatRealtime() {
    if (chatChannel || !window.activeDbClient) return;
    chatChannel = window.activeDbClient
        .channel('chat_messages_stream')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
            handleRealtimeInsert(payload.new);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
            handleRealtimeDelete(payload.old);
        })
        .subscribe();
}

function handleRealtimeInsert(msg) {
    const isOwnRecentSend = msg.nickname === (playerData.nickname || '').toUpperCase() && (Date.now() - recentlySentAt < 4000);
    if (isOwnRecentSend) return;

    if (!chatScreen.classList.contains('hidden')) {
        cachedChatMessages.push(msg);
        if (cachedChatMessages.length > 50) cachedChatMessages.shift();
        renderChatMessages(cachedChatMessages);
        markChatSeen();
    } else {
        unreadCount++;
        updateChatBadges(unreadCount);
    }
}

function handleRealtimeDelete(oldMsg) {
    cachedChatMessages = cachedChatMessages.filter(m => m.id !== oldMsg.id);
    if (!chatScreen.classList.contains('hidden')) {
        renderChatMessages(cachedChatMessages);
    }
}

function openChat() {
    initAudio();
    showScreen('chat');
    updateChatBadges(0);
    unreadCount = 0;
    showChatSkeleton();
    fetchChatMessages();
    subscribeChatRealtime();
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(fetchChatMessages, CHAT_RECONCILE_POLL_MS);
}

function closeChat() {
    showScreen(isPlaying ? null : 'start');
    if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }
}

document.getElementById('open-chat-btn').addEventListener('click', openChat);
document.getElementById('end-chat-btn').addEventListener('click', openChat);
document.getElementById('close-chat-btn').addEventListener('click', closeChat);
chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

subscribeChatRealtime();
fetchUnreadChatCount();
chatUnreadPollInterval = setInterval(fetchUnreadChatCount, CHAT_UNREAD_POLL_MS);
