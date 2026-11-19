// ============================================================================
// Chat Interface — ควบคุมหน้าแชทหลัก
// ============================================================================

let currentConversationId = null;
let isTyping = false;
let lastAssistantMessageId = null;

// อ้างอิง DOM elements
const elements = {
    startChatBtn: document.getElementById('startChatBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    welcomeSection: document.getElementById('welcomeSection'),
    chatArea: document.getElementById('chatArea'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    copyBtn: document.getElementById('copyBtn'),
    citationPanel: document.getElementById('citationPanel'),
    citationList: document.getElementById('citationList'),
    systemStatus: document.getElementById('systemStatus'),
    toast: document.getElementById('toast'),
};

// เริ่มต้นการทำงาน
document.addEventListener('DOMContentLoaded', async () => {
    // ตรวจสอบสถานะระบบ
    await checkSystemStatus();

    // ปุ่มเริ่มสนทนา
    elements.startChatBtn.addEventListener('click', startConversation);
    elements.newChatBtn.addEventListener('click', startNewConversation);

    // ปุ่มส่งข้อความ
    elements.sendBtn.addEventListener('click', sendMessage);

    // ปุ่มคัดลอกคำตอบ
    elements.copyBtn.addEventListener('click', copyLastResponse);

    // ปุ่มปิดแผงอ้างอิง
    document.querySelector('#citationPanel .btn-outline').addEventListener('click', () => {
        toggleCitationPanel();
    });

    // Enter ส่งข้อความ (Shift+Enter ขึ้นบรรทัดใหม่)
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // ปรับขนาด textarea ตามเนื้อหา
    elements.messageInput.addEventListener('input', () => {
        elements.messageInput.style.height = 'auto';
        elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
        updateSendButtonState();
    });

    // ปิด citation panel เมื่อคลิกนอกพื้นที่
    document.addEventListener('click', (e) => {
        if (
            !elements.citationPanel.contains(e.target) &&
            !e.target.closest('#startChatBtn')
        ) {
            // ปิดเมื่อคลิกนอก (ไม่บังคับ)
        }
    });
});

// ตรวจสอบสถานะระบบ
async function checkSystemStatus() {
    try {
        const response = await fetch(`${window.API_BASE || 'http://localhost:8000'}/health`);
        if (response.ok) {
            const data = await response.json();
            updateStatusIndicator(true, data.ai_provider || 'ไม่ระบุ');
        } else {
            updateStatusIndicator(false, 'เกิดข้อผิดพลาด');
        }
    } catch (error) {
        updateStatusIndicator(false, 'ไม่สามารถเชื่อมต่อระบบ');
        showToast('ไม่สามารถเชื่อมต่อกับระบบ backend กรุณาตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่', 'error');
    }
}

// อัปเดตตัวบ่งชี้สถานะ
function updateStatusIndicator(connected, provider) {
    const dot = elements.systemStatus.querySelector('.status-dot');
    const text = elements.systemStatus.querySelector('.status-text');

    if (connected) {
        dot.style.background = '#10b981';
        text.textContent = `ระบบพร้อมใช้งาน (${provider})`;
    } else {
        dot.style.background = '#ef4444';
        text.textContent = 'ระบบไม่พร้อมใช้งาน';
    }
}

// เริ่มบทสนทนาใหม่
async function startConversation() {
    try {
        const result = await window.apiService.createConversation();
        if (result.success) {
            currentConversationId = result.data.conversation_id || result.data.id;
            elements.welcomeSection.style.display = 'none';
            elements.chatArea.style.display = 'flex';
            elements.newChatBtn.style.display = 'inline-flex';
            elements.startChatBtn.style.display = 'none';
            elements.messageInput.focus();

            // เพิ่มข้อความต้อนรับ
            addMessage('assistant', 'สวัสดีค่ะ ยินดีต้อนรับสู่ผู้ช่วยตอบคำถามกลุ่มพัฒนาระบบบริหาร กระทรวงการคลัง\n\nท่านสามารถสอบถามข้อมูลเกี่ยวกับภารกิจของหน่วยงาน การพัฒนาระบบราชการ การบริหารจัดการภาครัฐ PMQA การติดตามประเมินผล และข้อมูลที่เกี่ยวข้องได้ค่ะ');
        } else {
            showToast('ไม่สามารถเริ่มบทสนทนาได้: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
}

// เริ่มบทสนทนาใหม่ (รีเซ็ต)
function startNewConversation() {
    currentConversationId = null;
    lastAssistantMessageId = null;
    elements.messagesContainer.innerHTML = '';
    elements.copyBtn.style.display = 'none';
    elements.citationPanel.style.display = 'none';
    elements.citationPanel.classList.remove('open');

    addMessage('assistant', 'สวัสดีค่ะ เริ่มบทสนทนาใหม่แล้วค่ะ ถามคำถามได้เลยค่ะ');
}

// ส่งข้อความ
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || isTyping) return;

    // แสดงข้อความผู้ใช้
    addMessage('user', message);
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    updateSendButtonState();

    // แสดงตัวกำลังพิมพ์
    showTyping(true);
    elements.sendBtn.disabled = true;

    try {
        const result = await window.apiService.sendMessage(message, currentConversationId);
        showTyping(false);
        elements.sendBtn.disabled = false;

        if (result.success) {
            const data = result.data;
            const responseText = data.response || data.message || 'ไม่มีคำตอบจากระบบ';
            currentConversationId = data.conversation_id || currentConversationId;

            addMessage('assistant', responseText, data.citations);
            elements.copyBtn.style.display = 'inline-block';
        } else {
            showToast('ไม่สามารถส่งข้อความได้: ' + result.error, 'error');
            addMessage('system', 'ขออภัยค่ะ เกิดข้อผิดพลาดในการตอบคำถาม กรุณาลองใหม่อีกครั้ง');
        }
    } catch (error) {
        showTyping(false);
        elements.sendBtn.disabled = false;
        showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
        addMessage('system', 'ขออภัยค่ะ ไม่สามารถเชื่อมต่อกับระบบได้ในขณะนี้');
    }
}

// เพิ่มข้อความในกล่องแชท
function addMessage(role, content, citations = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    if (role === 'system') {
        messageDiv.className = 'message meta';
    }

    // แปลงข้อความเป็น HTML (รองรับข้อความธรรมดา)
    const formattedContent = formatMessageContent(content);
    messageDiv.innerHTML = formattedContent;

    elements.messagesContainer.appendChild(messageDiv);
    scrollToBottom();

    // ถ้ามี citation ให้แสดงแผงอ้างอิง
    if (citations && citations.length > 0) {
        showCitations(citations);
    }

    lastAssistantMessageId = messageDiv;
    return messageDiv;
}

// ฟอร์แมตเนื้อหาข้อความ (รองรับข้อความธรรมดา)
function formatMessageContent(text) {
    // แยกย่อหน้า
    const paragraphs = text.split('\n\n');
    return paragraphs.map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
}

// escape HTML เพื่อป้องกัน XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// แสดงตัวกำลังพิมพ์
function showTyping(show) {
    isTyping = show;
    const existing = document.querySelector('.typing');
    if (show && !existing) {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing assistant';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        elements.messagesContainer.appendChild(typingDiv);
        scrollToBottom();
    } else if (!show && existing) {
        existing.remove();
    }
}

// เลื่อนไปที่ข้อความล่าสุด
function scrollToBottom() {
    setTimeout(() => {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }, 100);
}

// อัปเดตสถานะปุ่มส่ง
function updateSendButtonState() {
    const hasText = elements.messageInput.value.trim().length > 0;
    elements.sendBtn.disabled = !hasText || isTyping;
}

// แสดงแหล่งอ้างอิง
function showCitations(citations) {
    elements.citationList.innerHTML = '';
    citations.forEach((cite, index) => {
        const item = document.createElement('div');
        item.className = 'citation-item';
        item.innerHTML = `
            <span class="doc-title">${escapeHtml(cite.document_title || 'เอกสารไม่ทราบชื่อ')}</span>
            <span class="doc-meta">${escapeHtml(cite.organization || '')} ${cite.page_number ? 'หน้า ' + cite.page_number : ''}</span>
            ${cite.excerpt ? `<div class="doc-excerpt">"${escapeHtml(cite.excerpt)}"</div>` : ''}
        `;
        elements.citationList.appendChild(item);
    });
}

// สลับแสดง/ซ่อนแผงอ้างอิง
function toggleCitationPanel() {
    const isOpen = elements.citationPanel.classList.contains('open');
    if (isOpen) {
        elements.citationPanel.classList.remove('open');
        elements.citationPanel.style.display = 'none';
    } else {
        elements.citationPanel.style.display = 'flex';
        setTimeout(() => elements.citationPanel.classList.add('open'), 10);
    }
}

// คัดลอกคำตอบล่าสุด
function copyLastResponse() {
    const lastMsg = document.querySelector('.message.assistant:last-child');
    if (!lastMsg) return;

    const text = lastMsg.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
        showToast('คัดลอกคำตอบแล้ว', 'success');
    }).catch(() => {
        showToast('ไม่สามารถคัดลอกได้', 'error');
    });
}

// เติมคำถามในช่องป้อนข้อมูล
function fillQuestion(question) {
    elements.messageInput.value = question;
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
    updateSendButtonState();
    elements.messageInput.focus();
}

// แสดง toast notification
function showToast(message, type = 'info') {
    const toast = elements.toast;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}