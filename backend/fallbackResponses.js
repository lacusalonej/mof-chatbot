/**
 * FallbackResponses สำหรับ Chatbot ผู้ช่วยอัจฉริยะกลุ่มพัฒนาระบบบริหาร (PSDG)
 * สำนักงานปลัดกระทรวงการคลัง
 * ให้ข้อความตอบแทนบนภาษาไทยและอังกฤษ
 * สำหรับสถานการณ์: ไม่มีหลักฐาน, หลักฐานไม่เพียงพอ, ข้อมูลขัดแย้ง,
 * เอกสารล้าสมัย, การค้นหาล้มเหลว, ผู้ให้บริการล้มเหลว, ผลลัพธ์ไม่ถูกต้อง
 *
 * ไม่เปิดเผย stack traces, filesystem paths, secrets หรือข้อมูลภายใน
 */

'use strict';

/**
 * ประเภทของสถานการณ์ fallback
 * @typedef {'NO_EVIDENCE'|'INSUFFICIENT_EVIDENCE'|'AMBIGUOUS'|'CONFLICTING_SOURCES'|'OUTDATED_INFO'|'RETRIEVAL_ERROR'|'PROVIDER_ERROR'|'INVALID_OUTPUT'|'OUT_OF_SCOPE'} FallbackReason
 */

/**
 * ข้อความ fallback ภาษาไทย
 */
const thaiResponses = {
  NO_EVIDENCE: `ขออภัยครับ ไม่พบข้อมูลที่เกี่ยวข้องกับคำถามนี้ในฐานความรู้ของกลุ่มพัฒนาระบบบริหาร

คุณสามารถติดต่อสอบถามเจ้าหน้าที่กลุ่มพัฒนาระบบบริหาร ได้โดยตรงที่:
📞 โทร: 02-126-5800, 02-273-9408
📧 อีเมล: saraban@mof.go.th
🌐 เว็บไซต์: https://psdg.mof.go.th/
📚 คลังความรู้: https://km.mof.go.th/`,

  INSUFFICIENT_EVIDENCE: `ขออภัยครับ ข้อมูลที่มีอยู่ไม่เพียงพอที่จะตอบคำถามนี้อย่างชัดเจน

เรากำลังพัฒนาให้ข้อมูลครอบคลุมมากขึ้น หากคุณมีรายละเอียดเพิ่มเติม เราจะช่วยค้นหาให้มากขึ้นได้`,

  AMBIGUOUS: `ขอโทษครับ คำถามดูจะไม่ชัดเจนเกินไป คุณสามารถอธิบายให้ชัดเจนขึ้นได้ไหมครับ?`,

  CONFLICTING_SOURCES: `ขออภัยครับ พบข้อมูลขัดแย้งกันระหว่างแหล่งข้อมูล เราไม่สามารถให้ข้อมูลที่เป็นที่ยอมรับอย่างเดียวได้

นี่คือแหล่งข้อมูลที่เราพบ:
{{#each sources}}
- {{this}}
{{/each}}

เราขอแนะนำให้ติดต่อเจ้าหน้าที่เพื่อขอข้อมูลที่ถูกต้องและเป็นปัจจุบันที่สุด`,

  OUTDATED_INFO: `ขออภัยครับ ข้อมูลที่เรามีอาจไม่เป็นปัจจุบันหรือมีการอัปเดตแล้ว

เราขอแนะนำให้ตรวจสอบข้อมูลล่าสุดจากแหล่งที่เป็นทางการ: https://psdg.mof.go.th/`,

  RETRIEVAL_ERROR: `ขออภัยครับ เกิดข้อผิดพลาดขณะค้นหาข้อมูลในขณะนี้ กรุณาลองใหม่อีกครั้งในภายหลัง

หากปัญหาเกิดขึ้นต่อเนื่อง ให้ติดต่อสอบถามเจ้าหน้าที่กลุ่มพัฒนาระบบบริหาร ได้ที่:
📞 โทร: 02-126-5800, 02-273-9408
📧 อีเมล: saraban@mof.go.th`,

  PROVIDER_ERROR: `ขออภัยครับ เกิดข้อผิดพลาดในขณะประมวลผลคำขอของคุณ กรุณาลองใหม่อีกครั้งในภายหลัง`,

  INVALID_OUTPUT: `ขออภัยครับ เกิดข้อผิดพลาดข้อมูลในการประมวลผลคำตอบ กรุณาลองใหม่อีกครั้ง`,

  OUT_OF_SCOPE: `สวัสดีครับ! ผมคือ PSDG Smart Assistant ผู้ช่วยข้อมูลด้านการพัฒนาระบบราชการของกลุ่มพัฒนาระบบบริหาร สำนักงานปลัดกระทรวงการคลัง

ฉันสามารถช่วยตอบคำถามเกี่ยวกับ:
• ภารกิจและอำนาจหน้าที่ของกลุ่มพัฒนาระบบบริหาร
• PMQA และ PMQA 4.0
• KPI และตัวชี้วัดความสำเร็จ
• การประเมินผลการปฏิบัติงาน
• การพัฒนาระบบราชการและยุทธศาสตร์
• การปรับปรุงกระบวนงานและคู่มือปฏิบัติงาน
• การบริหารความเสี่ยงและ Risk Matrix
• ระบบควบคุมภายใน
• การจัดการความรู้ (KM) และ Knowledge Bank
• การสำรวจความพึงพอใจของผู้รับบริการ
• เอกสาร คู่มือ และรายงานราชการ

คุณมีคำถามอะไรเกี่ยวกับกลุ่มพัฒนาระบบบริหารไหมครับ?`,
};

/**
 * ข้อความ fallback ภาษาอังกฤษ
 */
const englishResponses = {
  NO_EVIDENCE: `I'm sorry, but I couldn't find any relevant information to answer your question in the PSDG knowledge base.

You can contact the System Development Group staff directly:
📞 Phone: 02-126-5800, 02-273-9408
📧 Email: saraban@mof.go.th
🌐 Website: https://psdg.mof.go.th/
📚 Knowledge Center: https://km.mof.go.th/`,

  INSUFFICIENT_EVIDENCE: `I'm sorry, but the available information is insufficient to answer your question clearly.

We're continuously improving our knowledge base. If you could provide more details, we'll try to assist you further.`,

  AMBIGUOUS: `I'm sorry, but your question seems a bit unclear. Could you please rephrase or provide more details?`,

  CONFLICTING_SOURCES: `I'm sorry, but we found conflicting information from our sources and cannot provide a single definitive answer.

Here are the sources we found:
{{#each sources}}
- {{this}}
{{/each}}

We recommend contacting the relevant officials for the most accurate and up-to-date information.`,

  OUTDATED_INFO: `I'm sorry, but the information we have may not be up-to-date.

We recommend verifying the latest information from official sources: https://psdg.mof.go.th/`,

  RETRIEVAL_ERROR: `I'm sorry, but we encountered an error while searching for information. Please try again later.

If the problem persists, you can contact the System Development Group:
📞 Phone: 02-126-5800, 02-273-9408
📧 Email: saraban@mof.go.th`,

  PROVIDER_ERROR: `I'm sorry, but we encountered an error while processing your request. Please try again later.`,

  INVALID_OUTPUT: `I'm sorry, but we encountered an error while generating the answer. Please try again later.`,

  OUT_OF_SCOPE: `Hello! I'm PSDG Smart Assistant, an information assistant for public administration development of the System Development Group (PSDG), Office of the Permanent Secretary, Ministry of Finance, Thailand.

I can help you with questions about:
• PSDG mission and authorities
• PMQA and PMQA 4.0
• KPI and performance indicators
• Performance evaluation
• Public administration development and strategy
• Process improvement and work manuals
• Risk management and risk matrix
• Internal control systems
• Knowledge management (KM) and Knowledge Bank
• Service satisfaction surveys
• Official documents, manuals, and reports

How can I help you today?`
};

/**
 * รายชื่อเหตุผลที่รองรับ
 */
const VALID_REASONS = [
  'NO_EVIDENCE',
  'INSUFFICIENT_EVIDENCE',
  'AMBIGUOUS',
  'CONFLICTING_SOURCES',
  'OUTDATED_INFO',
  'RETRIEVAL_ERROR',
  'PROVIDER_ERROR',
  'INVALID_OUTPUT',
  'OUT_OF_SCOPE'
];

/**
 * ฟังก์ชันง่าย ๆ สำหรับทำ template (เพียงแค่ {{this}} replacement)
 * @param {string} template - สตริง template
 * @param {Object} data - ข้อมูลสำหรับแทนที่ (เช่น {sources: [...]})
 * @returns {string}
 */
function simpleTemplate(template, data) {
  if (!data) return template;

  // จัดการ {{#each sources}}...{{/each}}
  if (template.includes('{{#each sources}}')) {
    const pattern = /\{\{#each sources\}\}([\s\S]*?)\{\{\/each\}\}/;
    const match = template.match(pattern);
    if (match && data.sources && Array.isArray(data.sources)) {
      const itemTemplate = match[1].trim();
      const items = data.sources.map(s => itemTemplate.replace('{{this}}', s));
      return template.replace(pattern, items.join('\n'));
    }
  }

  return template;
}

/**
 * ฟังก์ชันหลักเพื่อขอ fallback response
 *
 * @param {FallbackReason} reason - เหตุผลสำหรับ fallback
 * @param {'th'|'en'} language - ภาษา (th หรือ en)
 * @param {Object} [data] - ข้อมูลเพิ่มเติมสำหรับ template (เช่น sources)
 * @returns {string} ข้อความ fallback ในภาษาที่ระบุ
 */
function getFallback(reason, language = 'th', data) {
  // ตรวจสอบ reason
  if (!VALID_REASONS.includes(reason)) {
    reason = 'INSUFFICIENT_EVIDENCE';
  }

  // ตรวจสอบ language
  if (language !== 'th' && language !== 'en') {
    language = 'th';
  }

  const responses = language === 'th' ? thaiResponses : englishResponses;
  const template = responses[reason] || responses.INSUFFICIENT_EVIDENCE;

  return simpleTemplate(template, data);
}

/**
 * ฟังก์ชันตรวจสอบว่าเหตุผลเป็น valid หรือไม่
 * @param {string} reason
 * @returns {boolean}
 */
function isValidReason(reason) {
  return VALID_REASONS.includes(reason);
}

module.exports = {
  getFallback,
  isValidReason,
  VALID_REASONS,
  // Export สำหรับการทดสอบ
  thaiResponses,
  englishResponses
};
