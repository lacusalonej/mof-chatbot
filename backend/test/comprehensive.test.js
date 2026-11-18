/**
 * PHASE D - Stage 4: Comprehensive Question Test (Master Prompt Section 14)
 * ทดสอบคำถาม 60 ข้อ ครอบคลุม 10 หมวด PSDG (หมวดละ 6 ข้อ)
 * ตรวจสอบว่า chatbot จำแนก intent ถูกต้องและมีคำตอบจริง (ไม่ใช่ fallback)
 * ทดสอบแบบ in-process ไม่ต้องอาศัย HTTP server (รวดเร็ว, deterministic)
 */

'use strict';

const { processWithoutLLM } = require('../promptEngine');
const RAGEngine = require('../rag');
const engine = new RAGEngine();

// 60 คำถาม ครอบคลุม 10 หมวด PSDG (หมวดละ 6 ข้อ) ตามข้อกำหนด Section 14
const CASES = [
  // ORGANIZATION_PROFILE — ข้อมูลองค์กรและอำนาจหน้าที่
  { question: 'สปก. คืออะไร', expectedIntent: 'ORGANIZATION_PROFILE' },
  { question: 'กลุ่มพัฒนาระบบบริหารมีหน้าที่อะไรบ้าง', expectedIntent: 'ORGANIZATION_PROFILE' },
  { question: 'วิสัยทัศน์ของ สปก. คืออะไร', expectedIntent: 'ORGANIZATION_PROFILE' },
  { question: 'พันธกิจของ สปก. คืออะไร', expectedIntent: 'ORGANIZATION_PROFILE' },
  { question: 'เบอร์โทรศัพท์ของ สปก. คืออะไร', expectedIntent: 'ORGANIZATION_PROFILE' },
  { question: 'อีเมลติดต่อของ สปก.', expectedIntent: 'ORGANIZATION_PROFILE' },

  // STRATEGY_AND_DEVELOPMENT — ยุทธศาสตร์และการพัฒนา
  { question: 'ยุทธศาสตร์การพัฒนาระบบราชการมีอะไรบ้าง', expectedIntent: 'STRATEGY_AND_DEVELOPMENT' },
  { question: 'แผนยุทธศาสตร์การพัฒนาภาครัฐ', expectedIntent: 'STRATEGY_AND_DEVELOPMENT' },
  { question: 'ประเด็นยุทธศาสตร์ที่ 1 คืออะไร', expectedIntent: 'STRATEGY_AND_DEVELOPMENT' },
  { question: 'ยุทธศาสตร์ด้านเทคโนโลยีสารสนเทศ', expectedIntent: 'STRATEGY_AND_DEVELOPMENT' },
  { question: 'กลยุทธ์การพัฒนาภาครัฐ', expectedIntent: 'STRATEGY_AND_DEVELOPMENT' },
  { question: 'ประเด็นยุทธศาสตร์ที่ 2', expectedIntent: 'STRATEGY_AND_DEVELOPMENT' },

  // PMQA — PMQA และ PMQA 4.0
  { question: 'PMQA 4.0 คืออะไร', expectedIntent: 'PMQA' },
  { question: 'เกณฑ์การประเมิน PMQA มีอะไรบ้าง', expectedIntent: 'PMQA' },
  { question: 'หมวด PMQA มีกี่หมวด', expectedIntent: 'PMQA' },
  { question: 'คู่มือ PMQA', expectedIntent: 'PMQA' },
  { question: 'รายงานผล PMQA', expectedIntent: 'PMQA' },
  { question: 'คะแนน PMQA', expectedIntent: 'PMQA' },

  // PERFORMANCE_AND_KPI — ตัวชี้วัด KPI และผลการดำเนินงาน
  { question: 'KPI ปี 2569 มีอะไรบ้าง', expectedIntent: 'PERFORMANCE_AND_KPI' },
  { question: 'ตัวชี้วัดความสำเร็จมีอะไรบ้าง', expectedIntent: 'PERFORMANCE_AND_KPI' },
  { question: 'ปีงบประมาณที่รองรับมีอะไรบ้าง', expectedIntent: 'PERFORMANCE_AND_KPI' },
  { question: 'สูตรการคำนวณ KPI', expectedIntent: 'PERFORMANCE_AND_KPI' },
  { question: 'รายงานไตรมาส KPI', expectedIntent: 'PERFORMANCE_AND_KPI' },
  { question: 'ตัวชี้วัด KPI ปี 2568', expectedIntent: 'PERFORMANCE_AND_KPI' },

  // PROCESS_IMPROVEMENT — การปรับปรุงกระบวนงาน
  { question: 'คู่มือปฏิบัติงาน SOP มีอะไรบ้าง', expectedIntent: 'PROCESS_IMPROVEMENT' },
  { question: 'ปรับปรุงกระบวนงานลดขั้นตอน', expectedIntent: 'PROCESS_IMPROVEMENT' },
  { question: 'Work Manual ระบบบริหาร', expectedIntent: 'PROCESS_IMPROVEMENT' },
  { question: 'วิเคราะห์กระบวนงาน', expectedIntent: 'PROCESS_IMPROVEMENT' },
  { question: 'คู่มือปฏิบัติงาน', expectedIntent: 'PROCESS_IMPROVEMENT' },
  { question: 'ลดขั้นตอนการทำงาน', expectedIntent: 'PROCESS_IMPROVEMENT' },

  // RISK_MANAGEMENT — การบริหารความเสี่ยง
  { question: 'บริหารความเสี่ยงคืออะไร', expectedIntent: 'RISK_MANAGEMENT' },
  { question: 'Risk Matrix ใช้ทำอะไร', expectedIntent: 'RISK_MANAGEMENT' },
  { question: 'แผนบริหารความเสี่ยง', expectedIntent: 'RISK_MANAGEMENT' },
  { question: 'ประเมินความเสี่ยงหน่วยงาน', expectedIntent: 'RISK_MANAGEMENT' },
  { question: 'ติดตามความเสี่ยง', expectedIntent: 'RISK_MANAGEMENT' },
  { question: 'ประเมินความเสี่ยง', expectedIntent: 'RISK_MANAGEMENT' },

  // INTERNAL_CONTROL — ระบบควบคุมภายใน
  { question: 'ระบบควบคุมภายในคืออะไร', expectedIntent: 'INTERNAL_CONTROL' },
  { question: 'หลักเกณฑ์ควบคุมภายใน', expectedIntent: 'INTERNAL_CONTROL' },
  { question: 'แบบประเมินควบคุมภายใน', expectedIntent: 'INTERNAL_CONTROL' },
  { question: 'รายงานควบคุมภายใน', expectedIntent: 'INTERNAL_CONTROL' },
  { question: 'การควบคุมภายในหน่วยงาน', expectedIntent: 'INTERNAL_CONTROL' },
  { question: 'ควบคุมภายใน ตรวจสอบได้', expectedIntent: 'INTERNAL_CONTROL' },

  // KNOWLEDGE_MANAGEMENT — การจัดการความรู้ (KM)
  { question: 'การจัดการความรู้ KM คืออะไร', expectedIntent: 'KNOWLEDGE_MANAGEMENT' },
  { question: 'คลังความรู้ของ สปก. มีอะไรบ้าง', expectedIntent: 'KNOWLEDGE_MANAGEMENT' },
  { question: 'ตู้สาระ Information Cabinet', expectedIntent: 'KNOWLEDGE_MANAGEMENT' },
  { question: 'แผน KM ประจำปี', expectedIntent: 'KNOWLEDGE_MANAGEMENT' },
  { question: 'กิจกรรม KM', expectedIntent: 'KNOWLEDGE_MANAGEMENT' },
  { question: 'ศูนย์ความรู้ของ สปก.', expectedIntent: 'KNOWLEDGE_MANAGEMENT' },

  // SERVICE_SATISFACTION — ความพึงพอใจของผู้รับบริการ
  { question: 'สำรวจความพึงพอใจผู้รับบริการ', expectedIntent: 'SERVICE_SATISFACTION' },
  { question: 'แบบสอบถามความพึงพอใจ', expectedIntent: 'SERVICE_SATISFACTION' },
  { question: 'ผลสำรวจความพึงพอใจ', expectedIntent: 'SERVICE_SATISFACTION' },
  { question: 'ข้อเสนอแนะปรับปรุงบริการ', expectedIntent: 'SERVICE_SATISFACTION' },
  { question: 'รายงานผลสำรวจ', expectedIntent: 'SERVICE_SATISFACTION' },
  { question: 'การสำรวจความพึงพอใจ', expectedIntent: 'SERVICE_SATISFACTION' },

  // DOCUMENTS_AND_PROJECTS — เอกสารและโครงการ
  { question: 'เอกสารโครงการพิเศษมีอะไรบ้าง', expectedIntent: 'DOCUMENTS_AND_PROJECTS' },
  { question: 'กฎหมายระเบียบคำสั่งราชการ', expectedIntent: 'DOCUMENTS_AND_PROJECTS' },
  { question: 'สืบค้นเอกสารราชการ', expectedIntent: 'DOCUMENTS_AND_PROJECTS' },
  { question: 'หนังสือเวียน', expectedIntent: 'DOCUMENTS_AND_PROJECTS' },
  { question: 'เอกสาร', expectedIntent: 'DOCUMENTS_AND_PROJECTS' },
  { question: 'รายงานผล', expectedIntent: 'DOCUMENTS_AND_PROJECTS' },
];

const FALLBACK_MARKER = 'ยังไม่พบข้อมูลที่ตรงกับคำถามนี้';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
    try {
        const detail = fn();
        passed++;
        console.log(`  PASS  ${name}${detail ? ' :: ' + detail : ''}`);
    } catch (err) {
        failed++;
        failures.push({ name, error: err.message });
        console.log(`  FAIL  ${name} :: ${err.message}`);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

(async function run() {
    console.log(`=== Stage 4: Comprehensive Question Test (${CASES.length} questions, 10 PSDG categories) ===\n`);

    for (const c of CASES) {
        const { question, expectedIntent } = c;
        await (async () => {
            const res = processWithoutLLM({ userMessage: question, retrievedDocuments: [] }, engine);
            const intent = res.intent;
            const answer = res.answer || '';

            check(`[${expectedIntent}] ${question}`, () => {
                assert(intent === expectedIntent,
                    `intent ผิดพลาด: ได้ "${intent}" คาดหวัง "${expectedIntent}"`);
                assert(typeof answer === 'string' && answer.length > 0,
                    'answer ว่างเปล่า');
                assert(!answer.includes(FALLBACK_MARKER),
                    'answer เป็นข้อความ fallback (ไม่พบข้อมูล)');
                return `intent=${intent} answerLen=${answer.length}`;
            });
        })();
    }

    console.log(`\n--- Stage 4 Summary ---`);
    console.log(`passed=${passed} failed=${failed} total=${passed + failed}`);
    if (failures.length) {
        console.log('\nFAILED CASES:');
        failures.forEach(f => console.log(` - ${f.name} :: ${f.error}`));
    }
    process.exit(failed === 0 ? 0 : 1);
})().catch(e => {
    console.error('FATAL', e);
    process.exit(2);
});
