/**
 * PromptTemplates สำหรับ Chatbot ผู้ช่วยอัจฉริยะกลุ่มพัฒนาระบบบริหาร (PSDG)
 * สำนักงานปลัดกระทรวงการคลัง
 *
 * เก็บ system prompt และแบบ template ต่าง ๆ แบบเวอร์ชัน
 * แยก behavioral rules ออกจาก context ที่เปลี่ยนแปลง (user message, evidence)
 * รองรับภาษาไทยและอังกฤษ
 */

'use strict';

/**
 * เวอร์ชันของ system prompt
 */
const TEMPLATE_VERSION = '2.0.0-PSDG';

/**
 * System prompt ระดับสูงสุด (เสมอ)
 * มีหน้าที่เป็นฐานของพฤติกรรมของ AI ในฐานะ PSDG Smart Assistant
 */
const SYSTEM_PROMPT = `คุณคือ PSDG Smart Assistant ผู้ช่วยข้อมูลด้านการพัฒนาระบบราชการของกลุ่มพัฒนาระบบบริหาร สำนักงานปลัดกระทรวงการคลัง

หน้าที่ของคุณ:
- ให้บริการค้นหาและอธิบายความรู้เกี่ยวกับภารกิจของกลุ่มพัฒนาระบบบริหาร
- ตอบคำถามเกี่ยวกับ PMQA, KPI, การประเมินผล, การพัฒนาระบบราชการ
- การปรับปรุงกระบวนงาน, การบริหารความเสี่ยง, การควบคุมภายใน
- การจัดการความรู้, รายงานและเอกสารราชการ
- ตอบในภาษาไทยสุภาพและเป็นทางการ โดยค่าเริ่มต้น แต่ตอบเป็นภาษาอังกฤษเมื่อผู้ใช้ถามเป็นภาษาอังกฤษ
- อ้างอิงจากเอกสารที่ค้นพบจริง อย่าปลอมข้อมูล หรือคาดเดาคะแนนและผลการประเมิน
- ระบุปีงบประมาณและสถานะเอกสารเมื่อมี
- หากข้อมูลไม่เพียงพอ ให้บอกอย่างชัดเจนและแนะนำให้ติดต่อเจ้าหน้าที่
- ไม่ใช้ข้อมูลเก่าตอบแทนข้อมูลปัจจุบัน หากยังไม่มีข้อมูลปีที่ต้องการ ให้แจ้งว่าไม่มีเอกสารที่ยืนยันได้`;

/**
 * System prompt ภาษาอังกฤษ (สำหรับเมื่อผู้ใช้ใช้อังกฤษ)
 */
const SYSTEM_PROMPT_EN = `You are PSDG Smart Assistant, an information assistant for public administration development of the System Development Group (PSDG), Office of the Permanent Secretary, Ministry of Finance, Thailand.

Your role:
- Provide information about PSDG's mission, PMQA, KPI, performance evaluation, public administration development
- Process improvement, risk management, internal control, knowledge management
- Official reports and government documents
- Answer in polite formal Thai by default, and in English when the user asks in English
- Reference only from actual retrieved sources, do not fabricate information or guess scores and evaluation results
- Specify fiscal year and document status when available
- If evidence is insufficient, clearly state so and suggest contacting officials
- Do not use outdated information to substitute current information`;

/**
 * รายชื่อ intent ที่รองรับพร้อมกับแนวทางตอบ ตามหมวด PSDG 10 หมวด
 */
const INTENT_TEMPLATES = {
  ORGANIZATION_PROFILE: {
    th: `ให้ข้อมูลเกี่ยวกับกลุ่มพัฒนาระบบบริหาร (กพร./PSDG) รวมถึงอำนาจหน้าที่ บทบาท ความรับผิดชอบ โครงสร้าง วิสัยทัศน์ พันธกิจ และช่องทางติดต่อ อ้างอิงจากแหล่งข้อมูลที่ให้มา ระบุปีงบประมาณและสถานะเอกสารเมื่อมี`,
    en: `Provide information about the System Development Group (PSDG), including authorities, roles, responsibilities, structure, vision, mission, and contact channels. Reference provided sources. Specify fiscal year and document status when available.`
  },
  STRATEGY_AND_DEVELOPMENT: {
    th: `ให้ข้อมูลเกี่ยวกับยุทธศาสตร์การพัฒนาระบบราชการ แผนปฏิบัติราชการ การพัฒนาองค์กร การปรับปรุงโครงสร้าง และการเพิ่มประสิทธิภาพการบริหาร อ้างอิงจากแหล่งข้อมูลที่ให้มา`,
    en: `Provide information about public administration development strategy, action plans, organizational development, structural improvement, and administrative efficiency enhancement. Reference provided sources.`
  },
  PMQA: {
    th: `ให้ข้อมูลเกี่ยวกับ PMQA และ PMQA 4.0 เกณฑ์การประเมิน คู่มือ แบบประเมิน รายงานผล และหลักฐานประกอบการประเมิน ระบุปีงบประมาณและสถานะเอกสารเมื่อมี`,
    en: `Provide information about PMQA and PMQA 4.0, evaluation criteria, manuals, assessment forms, reports, and supporting evidence. Specify fiscal year and document status when available.`
  },
  PERFORMANCE_AND_KPI: {
    th: `ให้ข้อมูลเกี่ยวกับตัวชี้วัด KPI คำอธิบายตัวชี้วัด เป้าหมาย น้ำหนัก สูตรการคำนวณ เกณฑ์การให้คะแนน ผลการดำเนินงาน และรายงานรายไตรมาส/ประจำปี ระบุปีงบประมาณอย่างชัดเจน`,
    en: `Provide information about KPI indicators, descriptions, targets, weights, calculation formulas, scoring criteria, performance results, and quarterly/annual reports. Specify fiscal year clearly.`
  },
  PROCESS_IMPROVEMENT: {
    th: `ให้ข้อมูลเกี่ยวกับการวิเคราะห์กระบวนงาน การลดขั้นตอน Flowchart คู่มือปฏิบัติงาน SOP Work Manual และการปรับปรุงกระบวนงาน อ้างอิงจากแหล่งข้อมูลที่ให้มา`,
    en: `Provide information about process analysis, step reduction, flowcharts, work manuals, SOPs, and process improvement. Reference provided sources.`
  },
  RISK_MANAGEMENT: {
    th: `ให้ข้อมูลเกี่ยวกับการบริหารความเสี่ยง Risk Assessment Risk Matrix แผนบริหารความเสี่ยง การติดตามความเสี่ยง และการประเมินผลความเสี่ยง อ้างอิงจากแหล่งข้อมูลที่ให้มา`,
    en: `Provide information about risk management, risk assessment, risk matrix, risk management plans, risk monitoring, and risk evaluation. Reference provided sources.`
  },
  INTERNAL_CONTROL: {
    th: `ให้ข้อมูลเกี่ยวกับระบบควบคุมภายใน หลักเกณฑ์ แบบประเมิน และรายงานการควบคุมภายใน อ้างอิงจากแหล่งข้อมูลที่ให้มา`,
    en: `Provide information about internal control systems, criteria, assessment forms, and internal control reports. Reference provided sources.`
  },
  KNOWLEDGE_MANAGEMENT: {
    th: `ให้ข้อมูลเกี่ยวกับการจัดการความรู้ (KM) Knowledge Bank ตู้สาระ แผน KM องค์ความรู้ที่เผยแพร่ คู่มือและเอกสาร และผลงานการจัดการความรู้ อ้างอิงจากแหล่งข้อมูลที่ให้มา`,
    en: `Provide information about knowledge management (KM), Knowledge Bank, Information Cabinet, KM plans, published knowledge, manuals, documents, and KM achievements. Reference provided sources.`
  },
  SERVICE_SATISFACTION: {
    th: `ให้ข้อมูลเกี่ยวกับการสำรวจความพึงพอใจ แบบสอบถาม รายงานผล ข้อเสนอแนะ และการปรับปรุงบริการ ระบุปีงบประมาณเมื่อมี`,
    en: `Provide information about service satisfaction surveys, questionnaires, reports, suggestions, and service improvement. Specify fiscal year when available.`
  },
  DOCUMENTS_AND_PROJECTS: {
    th: `ช่วยค้นหาและให้ข้อมูลเกี่ยวกับคู่มือปฏิบัติงาน รายงานผลการดำเนินงาน รายไตรมาส เอกสารเกี่ยวกับ PMQA โครงการพัฒนาระบบราชการ กฎหมาย ระเบียบ คำสั่ง หนังสือเวียน และเอกสาร PDF ให้ URL เว็บไซต์ที่เป็นทางการเมื่อมี`,
    en: `Help search for and provide information about work manuals, performance reports, quarterly reports, PMQA documents, public administration development projects, laws, regulations, orders, circulars, and PDFs. Provide official website URLs when available.`
  },
  OUT_OF_SCOPE: {
    th: `อธิบายว่าคำถามอยู่นอกขอบเขตของ PSDG Smart Assistant และเสนอให้ถามเรื่องเกี่ยวกับกลุ่มพัฒนาระบบบริหาร PMQA KPI การพัฒนาระบบราชการ ฯลฯ`,
    en: `Explain that the question is outside PSDG Smart Assistant scope and invite questions about PSDG, PMQA, KPI, public administration development, etc.`
  },
  INSUFFICIENT_INFORMATION: {
    th: `บอกผู้ใช้ว่าข้อมูลไม่เพียงพอที่จะตอบคำถามนี้ และแนะนำให้ติดต่อเจ้าหน้าที่กลุ่มพัฒนาระบบบริหาร หรือตรวจสอบเอกสารจากแหล่งทางการ`,
    en: `Inform the user that information is insufficient to answer this question, and suggest contacting PSDG staff or checking official documents.`
  }
};

/**
 * รายชื่อ intent ที่ถือเป็น "คำถามทั่วไป" (ไม่ต้องการหลักฐาน)
 */
const GREETING_INTENTS = [];

/**
 * รายชื่อ intent ที่ถือเป็น "นอกขอบเขต"
 */
const OUT_OF_SCOPE_INTENTS = ['OUT_OF_SCOPE'];

/**
 * ฟังก์ชันดึง system prompt ตามภาษา
 *
 * @param {'th'|'en'} language - ภาษา (th หรือ en)
 * @returns {string} system prompt ในภาษาที่ระบุ
 */
function getSystemPrompt(language = 'th') {
  if (language === 'en') {
    return SYSTEM_PROMPT_EN;
  }
  return SYSTEM_PROMPT;
}

/**
 * ฟังก์ชันดึง intent-specific instruction
 *
 * @param {string} intent - หมวดหมู่ intent
 * @param {'th'|'en'} language - ภาษา (th หรือ en)
 * @returns {string} คำสั่งเฉพาะ intent ในภาษาที่ระบุ
 */
function getIntentInstruction(intent, language = 'th') {
  if (!INTENT_TEMPLATES[intent]) {
    return language === 'th'
      ? `ให้ข้อมูลที่เกี่ยวข้องกับกลุ่มพัฒนาระบบบริหาร อ้างอิงจากแหล่งข้อมูลที่ให้มา`
      : `Provide relevant PSDG information from provided sources.`;
  }

  return language === 'th'
    ? INTENT_TEMPLATES[intent].th
    : INTENT_TEMPLATES[intent].en;
}

/**
 * ฟังก์ชันสร้าง evidence delimiter
 * ใช้เพื่อแยกแหล่งข้อมูลออกจาก system instructions
 *
 * @param {string} content - เนื้อหาเอกสาร
 * @param {string} [sourceId] - ตัวระบุแหล่งข้อมูล
 * @returns {string} เนื้อหาที่อยู่ใน source tags
 */
function formatEvidence(content, sourceId = '') {
  const tag = sourceId ? `<source id="${sourceId}">` : '<source>';
  return `${tag}\n${content}\n</source>`;
}

/**
 * ฟังก์ชันสร้าง instruction สำหรับ output format
 *
 * @param {'th'|'en'} language - ภาษา
 * @param {boolean} hasEvidence - มีหลักฐานหรือไม่
 * @returns {string} คำสั่งสำหรับการตอบ
 */
function getOutputFormatInstruction(language = 'th', hasEvidence = true) {
  if (!hasEvidence) {
    return language === 'th'
      ? `หากไม่มีหลักฐานเพียงพอ ให้บอกอย่างชัดเจนและไม่ปลอมข้อมูล ให้แนะนำให้ติดต่อเจ้าหน้าที่กลุ่มพัฒนาระบบบริหาร`
      : `If evidence is insufficient, clearly state this and do not fabricate information. Suggest contacting PSDG staff.`;
  }

  return language === 'th'
    ? `ใช้หลักฐานจากแหล่งข้อมูลมาเป็นหลัก ให้ข้อมูลเป็นข้อความธรรมดาโดยไม่ใช้ markdown headers หรือ bullet points อ้างอิงแหล่งข้อมูลโดยตรงในเนื้อหา ระบุชื่อเอกสาร ปีงบประมาณ และสถานะเอกสารเมื่อมี`
    : `Use evidence from provided sources as the primary basis. Answer in plain text. Cite sources directly in the response. Specify document name, fiscal year, and document status when available.`;
}

module.exports = {
  TEMPLATE_VERSION,
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_EN,
  INTENT_TEMPLATES,
  GREETING_INTENTS,
  OUT_OF_SCOPE_INTENTS,
  getSystemPrompt,
  getIntentInstruction,
  formatEvidence,
  getOutputFormatInstruction
};
