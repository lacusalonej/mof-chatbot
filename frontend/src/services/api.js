// ============================================================================
// API Service — การเรียกใช้งาน Backend API
// ============================================================================

const API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost:8000'
    : window.location.protocol + '//' + window.location.hostname + ':8000';

// สถานะการเชื่อมต่อ
let isConnected = false;

export const apiService = {
    // ตรวจสอบสถานะระบบ
    async healthCheck() {
        try {
            const response = await fetch(`${API_BASE}/health`);
            const data = await response.json();
            isConnected = true;
            return { success: true, data };
        } catch (error) {
            isConnected = false;
            return { success: false, error: error.message };
        }
    },

    // ส่งข้อความแชท
    async sendMessage(message, conversationId = null) {
        try {
            const response = await fetch(`${API_BASE}/api/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    conversation_id: conversationId,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // ดึงประวัติการสนทนา
    async getConversation(conversationId) {
        try {
            const response = await fetch(`${API_BASE}/api/chat/conversation/${conversationId}`);
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // สร้างบทสนทนาใหม่
    async createConversation() {
        try {
            const response = await fetch(`${API_BASE}/api/chat/conversation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
};

// ฟังก์ชันสำหรับใช้งานในหน้า HTML (global)
window.apiService = apiService;
window.API_BASE = API_BASE;