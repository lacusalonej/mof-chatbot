/**
 * IntentClassifier สำหรับ Chatbot ผู้ช่วยอัจฉริยะกลุ่มพัฒนาระบบบริหาร (PSDG)
 * สำนักงานปลัดกระทรวงการคลัง
 *
 * ใช้ approach แบบ deterministic/keyword-based เพื่อ classification
 * ไม่ใช้ LLM เสริม (ยังไม่มี integration)
 *
 * รองรับ 10 หมวดหลักตามข้อกำหนด PSDG:
 * - ORGANIZATION_PROFILE
 * - STRATEGY_AND_DEVELOPMENT
 * - PMQA
 * - PERFORMANCE_AND_KPI
 * - PROCESS_IMPROVEMENT
 * - RISK_MANAGEMENT
 * - INTERNAL_CONTROL
 * - KNOWLEDGE_MANAGEMENT
 * - SERVICE_SATISFACTION
 * - DOCUMENTS_AND_PROJECTS
 */

'use strict';

/**
 * รายชื่อ intent ทั้งหมดที่รองรับ (allowlist) ตามข้อกำหนด PSDG
 */
const VALID_INTENTS = [
  'ORGANIZATION_PROFILE',
  'STRATEGY_AND_DEVELOPMENT',
  'PMQA',
  'PERFORMANCE_AND_KPI',
  'PROCESS_IMPROVEMENT',
  'RISK_MANAGEMENT',
  'INTERNAL_CONTROL',
  'KNOWLEDGE_MANAGEMENT',
  'SERVICE_SATISFACTION',
  'DOCUMENTS_AND_PROJECTS',
  'OUT_OF_SCOPE',
  'INSUFFICIENT_INFORMATION'
];

/**
 * พจนานุกรมและ keyword สำหรับแต่ละ intent
 * เรียงลำดับจากเฉพาะไปยังทั่วไป (เฉพาะจะถูกตรวจสอบก่อน)
 */
const INTENT_KEYWORDS = {
  ORGANIZATION_PROFILE: [
    'กลุ่มพัฒนาระบบบริหาร', 'กพร.', 'psdg', 'หน้าที่', 'อำนาจหน้าที่',
    'โครงสร้าง', 'ประวัติ', 'วิสัยทัศน์', 'พันธกิจ', 'สังกัด', 'สปก.',
    'สำนักงานปลัดกระทรวงการคลัง', 'ช่องทางติดต่อ', 'บทบาท', 'ความรับผิดชอบ'
  ],

  STRATEGY_AND_DEVELOPMENT: [
    'ยุทธศาสตร์', 'แผนยุทธศาสตร์', 'พัฒนาระบบราชการ', 'พัฒนาภาครัฐ',
    'กลยุทธ์', 'แผนปฏิบัติราชการ', 'พัฒนาองค์กร', 'ปรับปรุงโครงสร้าง',
    'เพิ่มประสิทธิภาพการบริหาร', 'นโยบายการพัฒนา'
  ],

  PMQA: [
    'PMQA', 'PMQA 4.0', 'หมวด PMQA', 'เกณฑ์การประเมิน', 'แบบประเมิน PMQA',
    'รายงานผล PMQA', 'หลักฐานประกอบการประเมิน', 'คู่มือ PMQA',
    'การประเมิน PMQA', 'คะแนน PMQA'
  ],

  PERFORMANCE_AND_KPI: [
    'KPI', 'ตัวชี้วัด', 'คำอธิบายตัวชี้วัด', 'เป้าหมาย', 'น้ำหนัก',
    'สูตรการคำนวณ', 'เกณฑ์การให้คะแนน', 'ผลการดำเนินงาน',
    'รายงานไตรมาส', 'รายงานประจำปี', 'ปีงบประมาณ', '2568', '2569', '2570'
  ],

  PROCESS_IMPROVEMENT: [
    'ปรับปรุงกระบวนงาน', 'วิเคราะห์กระบวนงาน', 'ลดขั้นตอน',
    'คู่มือปฏิบัติงาน', 'SOP', 'Work Manual', 'Flowchart',
    'การปรับปรุงกระบวนงาน', 'ลดความซ้ำซ้อน'
  ],

  RISK_MANAGEMENT: [
    'บริหารความเสี่ยง', 'Risk Management', 'Risk Assessment', 'Risk Matrix',
    'แผนบริหารความเสี่ยง', 'ติดตามความเสี่ยง', 'ประเมินความเสี่ยง',
    'การจัดการความเสี่ยง', 'มาตรการลดความเสี่ยง'
  ],

  INTERNAL_CONTROL: [
    'ควบคุมภายใน', 'Internal Control', 'ระบบควบคุมภายใน',
    'หลักเกณฑ์ควบคุมภายใน', 'แบบประเมินควบคุมภายใน',
    'รายงานควบคุมภายใน', 'การควบคุมภายในหน่วยงาน'
  ],

  KNOWLEDGE_MANAGEMENT: [
    'KM', 'การจัดการความรู้', 'Knowledge Management', 'Knowledge Bank',
    'ตู้สาระ', 'Information Cabinet', 'แผน KM', 'องค์ความรู้',
    'คลังความรู้', 'ศูนย์ความรู้', 'คู่มือ KM', 'กิจกรรม KM'
  ],

  SERVICE_SATISFACTION: [
    'ความพึงพอใจ', 'Service Satisfaction', 'สำรวจความพึงพอใจ',
    'แบบสอบถาม', 'ข้อเสนอแนะ', 'ปรับปรุงบริการ',
    'ผลสำรวจ', 'รายงานผลสำรวจ', 'ผู้รับบริการ'
  ],

  DOCUMENTS_AND_PROJECTS: [
    'คู่มือ', 'เอกสาร', 'โครงการพิเศษ', 'รายงานผล', 'แผนงาน',
    'กฎหมาย', 'ระเบียบ', 'คำสั่ง', 'หนังสือเวียน', 'PDF',
    'ดาวน์โหลดเอกสาร', 'สืบค้นเอกสาร'
  ],

  OUT_OF_SCOPE: [
    'ทำนาย', 'ดูดวง', 'หวย', 'เดิมพัน', 'บันเทิง', 'บิน',
    'เที่ยวบิน', 'ภาษาอะไร', 'สุขภาพ', 'แพ้', 'ยา',
    'ความสัมพันธ์', 'เงิน', 'ทอง', 'หุ้น', 'ลงทุน',
    'เล่นเกม', 'เพลง', 'ภาพยนตร์', 'หนัง'
  ]
};

/**
 * คำนวณคะแนนสำหรับ intent โดยใช้ keyword matching
 *
 * @param {string} query - คำถามผู้ใช้ (ต่ำคำ)
 * @param {string[]} keywords - รายการคำสำคัญ
 * @returns {number} คะแนน (0 ถ้าไม่มี match)
 */
function scoreIntent(query, keywords) {
  let score = 0;
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (query.includes(kwLower)) {
      const tokenLength = kwLower.replace(/[.\s]/g, '').length;
      score += tokenLength > 0 ? Math.max(4, Math.min(10, tokenLength)) : 5;
    }
  }
  return score;
}

/**
 * ตรวจสอบว่าเป็นการถามต่อ (follow-up) หรือไม่
 *
 * @param {string} query - คำถามผู้ใช้
 * @param {Array} history - ประวัติการสนทนา
 * @returns {boolean}
 */
function isFollowUpQuestion(query, history) {
  if (!history || history.length < 2) return false;

  const shortQuery = query.trim().split(/[\s]+/).length <= 4;
  const hasPronoun = /^(นั้น|นี้|มัน|เรา|คุณ|ต่อ|ต่อไป|เพิ่ม|ละเอียด|อธิบาย|อย่าง|เช่น|เหตุผล|ทำไม|อย่างไร)$/i.test(query.trim());

  return shortQuery || hasPronoun;
}

/**
 * ฟังก์ชันหลักสำหรับการ classification intent
 *
 * @param {string} userMessage - ข้อความผู้ใช้
 * @param {Array<{role: string, content: string}>} [conversationHistory] - ประวัติการสนทนา
 * @param {string} [detectedLanguage='th'] - ภาษาที่ตรวจจับได้
 * @returns {string} intent ที่ classification แล้ว
 *
 * @example
 * classifyIntent('กลุ่มพัฒนาระบบบริหารมีหน้าที่อะไรบ้าง');  // 'ORGANIZATION_PROFILE'
 * classifyIntent('PMQA 4.0 คืออะไร');  // 'PMQA'
 */
function classifyIntent(userMessage, conversationHistory, detectedLanguage = 'th') {
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return 'INSUFFICIENT_INFORMATION';
  }

  const query = userMessage.toLowerCase().trim();

  if (conversationHistory && isFollowUpQuestion(query, conversationHistory)) {
    return 'INSUFFICIENT_INFORMATION';
  }

  const scores = {};
  for (const intent of VALID_INTENTS) {
    if (intent === 'INSUFFICIENT_INFORMATION' || intent === 'OUT_OF_SCOPE') {
      continue;
    }
    scores[intent] = scoreIntent(query, INTENT_KEYWORDS[intent] || []);
  }

  let bestIntent = null;
  let maxScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestIntent = intent;
    }
  }

  if (maxScore >= 4) {
    return bestIntent;
  }

  const outOfScopeScore = scoreIntent(query, INTENT_KEYWORDS.OUT_OF_SCOPE || []);
  if (outOfScopeScore >= 4) {
    return 'OUT_OF_SCOPE';
  }

  const tokenCount = query.split(/[\s]+/).filter(t => t.length > 0).length;

  if (tokenCount <= 2 && (query.includes('ใช่') || query.includes('ไหม') || query.includes('หรือ'))) {
    return 'INSUFFICIENT_INFORMATION';
  }

  return 'INSUFFICIENT_INFORMATION';
}

/**
 * ตรวจสอบว่าค่า intent เป็น valid หรือไม่
 *
 * @param {string} intent
 * @returns {boolean}
 */
function isValidIntent(intent) {
  return VALID_INTENTS.includes(intent);
}

/**
 * คืนค่า list ของ intent ทั้งหมดที่รองรับ
 *
 * @returns {string[]}
 */
function getValidIntents() {
  return [...VALID_INTENTS];
}

module.exports = {
  classifyIntent,
  isValidIntent,
  getValidIntents,
  VALID_INTENTS,
  INTENT_KEYWORDS,
  scoreIntent,
  isFollowUpQuestion
};
