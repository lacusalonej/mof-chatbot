// ============================================================================
// Admin Dashboard — ควบคุมหน้าผู้ดูแลระบบ
// ============================================================================

const API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost:8000'
    : window.location.protocol + '//' + window.location.hostname + ':8000';

let currentSection = 'dashboard';
let isSidebarOpen = false;

// อ้างอิง DOM
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const sections = document.querySelectorAll('.dashboard-section');
const navItems = document.querySelectorAll('.nav-item');

// เริ่มต้น
document.addEventListener('DOMContentLoaded', () => {
    // ตรวจสอบการล็อกอิน (ตัวอย่าง — ในจริงควรตรวจสอบ token จาก backend)
    const token = localStorage.getItem('admin_token');
    if (!token) {
        // ยังไม่ได้ล็อกอิน ให้แสดงหน้าล็อกอิน
        showLoginScreen();
    }

    // Toggle sidebar บนมือถือ
    menuToggle.addEventListener('click', toggleSidebar);

    // ปิด modal เมื่อคลิกนอกพื้นที่
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // โหลดข้อมูลเริ่มต้น
    loadDashboardData();
});

// สลับแถบด้านข้าง
function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    if (isSidebarOpen) {
        sidebar.classList.add('open');
    } else {
        sidebar.classList.remove('open');
    }
}

// สลับ섹ชัน
function switchSection(sectionName) {
    currentSection = sectionName;

    // อัปเดต nav items
    navItems.forEach(item => {
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // อัปเดต sections
    sections.forEach(section => {
        if (section.id === `section-${sectionName}`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // อัปเดตหัวข้อหน้า
    const titleMap = {
        dashboard: 'ภาพรวมระบบ',
        documents: 'จัดการเอกสาร',
        websites: 'แหล่งข้อมูลเว็บไซต์',
        faq: 'จัดการคำถามที่พบบ่อย',
        conversations: 'บทสนทนา',
        'ai-config': 'กำหนดค่า AI',
        users: 'จัดการผู้ใช้',
        'trial-links': 'ลิงก์ทดลองใช้งาน',
        'audit-logs': 'ประวัติการใช้งาน',
    };
    document.querySelector('.top-bar-title').textContent = titleMap[sectionName] || sectionName;

    // ปิด sidebar บนมือถือ
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        isSidebarOpen = false;
    }

    // โหลดข้อมูลตาม섹ชัน
    loadSectionData(sectionName);
}

// โหลดข้อมูลภาพรวม
async function loadDashboardData() {
    try {
        // ในระบบจริงจะเรียก API จาก backend
        // ตอนนี้ใช้ข้อมูลตัวอย่าง
        document.getElementById('statDocCount').textContent = '0';
        document.getElementById('statActiveDoc').textContent = '0';
        document.getElementById('statPendingDoc').textContent = '0';
        document.getElementById('statErrorDoc').textContent = '0';
        document.getElementById('statChatCount').textContent = '0';
        document.getElementById('statSessionCount').textContent = '0';

        document.getElementById('popularQuestions').innerHTML =
            '<p class="text-muted">ยังไม่มีข้อมูลคำถาม</p>';
        document.getElementById('unansweredQuestions').innerHTML =
            '<p class="text-muted">ยังไม่มีข้อมูลคำถามที่ตอบไม่ได้</p>';
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// โหลดข้อมูลตาม섹ชัน
async function loadSectionData(sectionName) {
    const tableBodies = {
        documents: 'documentsTableBody',
        websites: 'websitesTableBody',
        faq: 'faqTableBody',
        conversations: 'conversationsTableBody',
        users: 'usersTableBody',
        'trial-links': 'trialLinksTableBody',
        'audit-logs': 'auditLogsTableBody',
    };

    const tbodyId = tableBodies[sectionName];
    if (!tbodyId) return;

    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '<tr><td colspan="100%" class="text-center">กำลังโหลดข้อมูล...</td></tr>';

    try {
        // จำลองการโหลดจาก API — ในระบบจริงจะเรียก fetch จาก backend
        setTimeout(() => {
            tbody.innerHTML = '<tr><td colspan="100%" class="text-center">ยังไม่มีข้อมูลในระบบ</td></tr>';
        }, 500);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="100%" class="text-center">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

// รีเฟรชข้อมูล
function refreshData() {
    loadDashboardData();
    loadSectionData(currentSection);
    showToast('รีเฟรชข้อมูลแล้ว', 'success');
}

// ===== Modals =====
function showUploadModal() {
    document.getElementById('uploadModal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// ===== Form Handlers =====
document.getElementById('uploadForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const file = document.getElementById('uploadFile').files[0];
    const title = document.getElementById('docTitle').value;
    const category = document.getElementById('docCategory').value;
    const classification = document.getElementById('docClassification').value;

    if (!file) {
        showToast('กรุณาเลือกไฟล์', 'error');
        return;
    }

    showToast(`กำลังอัปโหลดไฟล์: ${file.name} ...`, 'success');
    closeModal('uploadModal');
});

document.getElementById('websiteForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('เพิ่มเว็บไซต์เรียบร้อยแล้ว', 'success');
    closeModal('websiteModal');
});

document.getElementById('trialLinkForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('สร้างลิงก์ทดลองเรียบร้อยแล้ว', 'success');
    closeModal('trialLinkModal');
});

document.getElementById('faqForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('เพิ่มคำถามที่พบบ่อยเรียบร้อยแล้ว', 'success');
    closeModal('faqModal');
});

document.getElementById('aiConfigForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('บันทึกการตั้งค่า AI เรียบร้อยแล้ว', 'success');
});

// ===== Filter Functions =====
function filterDocuments() {
    const search = document.getElementById('docSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#documentsTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}

// ===== Placeholder Functions =====
function showWebsiteModal() {
    document.getElementById('websiteModal').classList.add('show');
}

function showTrialLinkModal() {
    document.getElementById('trialLinkModal').classList.add('show');
}

function showFAQModal() {
    document.getElementById('faqModal').classList.add('show');
}

function showLoginScreen() {
    // ในระบบจริงจะแสดงหน้าเข้าสู่ระบบ
    console.log('แสดงหน้าเข้าสู่ระบบ');
}

function logout() {
    localStorage.removeItem('admin_token');
    showToast('ออกจากระบบแล้ว', 'success');
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// ===== Toast =====
function showToast(message, type = 'info') {
    // สร้าง toast element ถ้ายังไม่มี
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--text-primary, #1f2937);
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 2000;
            transition: transform 0.3s ease;
            opacity: 0;
        `;
        document.body.appendChild(toast);
    }

    if (type === 'error') toast.style.background = '#ef4444';
    if (type === 'success') toast.style.background = '#10b981';
    if (type === 'warning') toast.style.background = '#f59e0b';

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 3000);
}