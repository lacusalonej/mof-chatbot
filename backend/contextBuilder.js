/**
 * ContextBuilder สำหรับ Chatbot ผู้ช่วยอัจฉริยะกลุ่มพัฒนาระบบบริหาร (PSDG)
 * สำนักงานปลัดกระทรวงการคลัง
 *
 * แปลงผลลัพธ์การค้นหา (retrieval results) เป็นบริบทหลักฐาน (evidence context)
 * ที่มีโครงสร้าง พร้อม metadata ครบถ้วน รองรับปีงบประมาณและสถานะเอกสาร
 *
 * ปฏิบัติตามหลักการ:
 * - เก็บรักษา document_id, title, url, dates, status, fiscal_year, page, section, score
 * - ใช้เฉพาะ fields ที่มีอยู่จริง (ไม่ปลอม metadata)
 * - จัดลำดับข้อมูลจากเอกสารให้เป็น evidence (trusted source)
 * - จัดการ context-size limits
 * - กรองเอกสารตามปีงบประมาณและสถานะเอกสาร
 */

'use strict';

/**
 * ค่าจำกัดสูงสุดของ context (characters)
 */
const MAX_CONTEXT_LENGTH = 8000;

/**
 * จำนวนเอกสารสูงสุดที่รวมอยู่ใน context
 */
const MAX_DOCUMENTS = 5;

/**
 * สถานะเอกสารที่ยอมรับใช้เป็นหลักฐาน (VERIFIED เท่านั้นที่เชื่อถือได้เต็มที่)
 */
const ACTIVE_STATUSES = ['VERIFIED', 'published', 'final', 'current'];

/**
 * สถานะเอกสารที่ถือเป็น historical/archived
 */
const HISTORICAL_STATUSES = ['OUTDATED', 'SUPERSEDED', 'archived', 'superseded', 'deprecated', 'historical'];

/**
 * สถานะเอกสารที่ห้ามใช้เป็นหลักฐานเด็ดขาด
 */
const BLOCKED_STATUSES = ['TEST_DATA', 'UNRELATED', 'DRAFT'];

/**
 * ปีงบประมาณที่รองรับ
 */
const SUPPORTED_FISCAL_YEARS = ['2568', '2569', '2570'];

/**
 * ตรวจสอบว่ามี metadata ครบถ้วนหรือไม่ (ใช้สำหรับ citation)
 *
 * @param {Object} doc
 * @returns {boolean}
 */
function hasCitableMetadata(doc) {
  return !!(doc.title || doc.url || doc.documentId);
}

/**
 * สร้าง citation object จาก document
 * ใช้เฉพาะ fields ที่มีอยู่จริง
 *
 * @param {Object} doc - เอกสารที่มี metadata
 * @returns {Object} citation object {title, url, page, section, fiscalYear, documentStatus}
 */
function buildCitation(doc) {
  const citation = {
    title: null,
    url: null,
    page: null,
    section: null,
    fiscalYear: null,
    documentStatus: null
  };

  if (doc.title) {
    citation.title = doc.title;
  }

  if (doc.sourceUrl || doc.url) {
    citation.url = doc.sourceUrl || doc.url;
  }

  if (typeof doc.pageNumber === 'number' || (doc.pageNumber && !isNaN(doc.pageNumber))) {
    citation.page = doc.pageNumber;
  }

  if (doc.sectionTitle) {
    citation.section = doc.sectionTitle;
  }

  if (doc.fiscalYear) {
    citation.fiscalYear = doc.fiscalYear;
  }

  if (doc.documentStatus) {
    citation.documentStatus = doc.documentStatus;
  }

  return citation;
}

/**
 * ตรวจสอบว่าเอกสารเป็นข้อมูลล้าสมัยหรือไม่
 *
 * @param {Object} doc
 * @returns {boolean}
 */
function isOutdated(doc) {
  if (!doc.documentStatus) return false;
  return HISTORICAL_STATUSES.includes(doc.documentStatus.toUpperCase());
}

/**
 * ตรวจสอบว่าเอกสารถูกบล็อกไม่ให้ใช้เป็นหลักฐานหรือไม่
 *
 * @param {Object} doc
 * @returns {boolean}
 */
function isBlockedStatus(doc) {
  if (!doc.documentStatus) return false;
  return BLOCKED_STATUSES.includes(doc.documentStatus.toUpperCase());
}

/**
 * ตรวจสอบว่าเอกสารตรงกับปีงบประมาณที่ต้องการหรือไม่
 *
 * @param {Object} doc
 * @param {string|null} targetFiscalYear - ปีงบประมาณเป้าหมาย (null = ไม่กรอง)
 * @returns {boolean}
 */
function matchesFiscalYear(doc, targetFiscalYear) {
  if (!targetFiscalYear) return true;
  if (!doc.fiscalYear) return true; // เอกสารที่ไม่ระบุปี ให้ผ่าน
  return String(doc.fiscalYear) === String(targetFiscalYear);
}

/**
 * ตรวจสอบว่าปีงบประมาณเป็นค่าที่รองรับหรือไม่
 *
 * @param {string} year
 * @returns {boolean}
 */
function isSupportedFiscalYear(year) {
  return SUPPORTED_FISCAL_YEARS.includes(String(year));
}

/**
 * จัดรูปแบบเอกสารเป็น evidence string
 *
 * @param {Object} doc - เอกสาร
 * @param {number} index - ลำดับ
 * @returns {string} ข้อความ evidence ที่จัดรูปแบบแล้ว
 */
function formatDocumentAsEvidence(doc, index) {
  const parts = [];

  // สร้างหัวข้อแหล่งข้อมูล
  const sourceLabel = doc.documentId || doc.id || `doc_${index + 1}`;
  parts.push(`[${sourceLabel}]`);

  // เพิ่ม title หากมี
  if (doc.title) {
    parts.push(`${doc.title}`);
  }

  // เพิ่มปีงบประมาณหากมี
  if (doc.fiscalYear) {
    parts.push(`(ปีงบประมาณ ${doc.fiscalYear})`);
  }

  // เพิ่มสถานะเอกสารหากมี
  if (doc.documentStatus) {
    parts.push(`สถานะ: ${doc.documentStatus}`);
  }

  // เพิ่ม URL หากมี
  const url = doc.sourceUrl || doc.url;
  if (url) {
    parts.push(`(แหล่งที่มา: ${url})`);
  }

  // เพิ่มเลขหน้าหรือส่วนหากมี
  if (doc.pageNumber) {
    parts.push(`หน้า ${doc.pageNumber}`);
  }
  if (doc.sectionTitle) {
    parts.push(`ส่วน: ${doc.sectionTitle}`);
  }

  // เพิ่มเนื้อหา
  parts.push('\n');
  parts.push(doc.content || '');

  return parts.join(' ');
}

/**
 * ตรวจสอบว่ามีข้อขัดแย้งระหว่างเอกสารหรือไม่
 *
 * @param {Array} documents
 * @returns {boolean}
 */
function hasConflictingDocuments(documents) {
  // ปัจจุบันใช้เป็นฟังก์ชันพื้นฐาน ไม่พบข้อขัดแย้งโดยอัตโนมัติ
  return false;
}

/**
 * ฟังก์ชันหลักสำหรับสร้างบริบทหลักฐาน
 *
 * @param {Array} retrievedDocuments - เอกสารที่ค้นหาได้
 * @param {Object} [options] - ตัวเลือกเพิ่มเติม
 * @param {boolean} [options.filterOutdated=false] - กรองเอกสารล้าสมัย
 * @param {boolean} [options.preserveSuperseded=false] - เก็บเอกสาร historical ถ้าเป็นข้อมูลประวัติ
 * @param {string|null} [options.fiscalYear=null] - กรองตามปีงบประมาณ
 * @param {number} [options.maxLength=MAX_CONTEXT_LENGTH] - ความยาวสูงสุดของ context
 * @param {number} [options.maxDocuments=MAX_DOCUMENTS] - จำนวนเอกสารสูงสุด
 * @returns {{context: string, citations: Array, hasEvidence: boolean, hasConflicts: boolean, hasOutdated: boolean, hasBlocked: boolean, skipped: Array}}
 */
function buildContext(retrievedDocuments, options = {}) {
  const opts = {
    filterOutdated: false,
    preserveSuperseded: false,
    fiscalYear: null,
    maxLength: MAX_CONTEXT_LENGTH,
    maxDocuments: MAX_DOCUMENTS,
    ...options
  };

  // จัดการอินพุตที่เป็น null/undefined/ไม่ใช่ array
  if (!retrievedDocuments || !Array.isArray(retrievedDocuments) || retrievedDocuments.length === 0) {
    return {
      context: '',
      citations: [],
      hasEvidence: false,
      hasConflicts: false,
      hasOutdated: false,
      hasBlocked: false,
      skipped: []
    };
  }

  const documents = [];
  const skipped = [];
  let hasOutdated = false;
  let hasBlocked = false;

  for (let i = 0; i < retrievedDocuments.length; i++) {
    const doc = retrievedDocuments[i];

    if (!doc || (typeof doc !== 'object' && typeof doc !== 'string')) {
      continue;
    }

    // จัดการกับ string input (retro compatibility)
    if (typeof doc === 'string') {
      documents.push({
        content: doc,
        documentId: `chunk_${i}`,
        index: i
      });
      continue;
    }

    // ตรวจสอบว่ามี content หรือ text
    if (!doc.content && !doc.text) {
      skipped.push({ reason: 'no content', doc });
      continue;
    }

    // สร้าง normalized document object
    const normalizedDoc = {
      documentId: doc.documentId || doc.id || doc.chunkId || `doc_${i}`,
      content: doc.content || doc.text,
      title: doc.title || null,
      sourceUrl: doc.sourceUrl || doc.url || null,
      publisher: doc.publisher || null,
      publishedDate: doc.publishedDate || null,
      effectiveDate: doc.effectiveDate || null,
      updatedAt: doc.updatedAt || null,
      documentStatus: doc.documentStatus || null,
      fiscalYear: doc.fiscalYear || null,
      pageNumber: doc.pageNumber || doc.page || null,
      sectionTitle: doc.sectionTitle || doc.section || null,
      retrievalScore: doc.retrievalScore || doc.score || null,
      index: i
    };

    // ตรวจสอบสถานะเอกสารที่ถูกบล็อก (TEST_DATA, UNRELATED, DRAFT)
    if (isBlockedStatus(normalizedDoc)) {
      hasBlocked = true;
      skipped.push({ reason: 'blocked_status', doc: normalizedDoc });
      continue;
    }

    // ตรวจสอบปีงบประมาณ
    if (!matchesFiscalYear(normalizedDoc, opts.fiscalYear)) {
      skipped.push({ reason: 'fiscal_year_mismatch', doc: normalizedDoc });
      continue;
    }

    // ตรวจสอบล้าสมัย
    if (opts.filterOutdated && isOutdated(normalizedDoc)) {
      hasOutdated = true;
      if (!opts.preserveSuperseded) {
        skipped.push({ reason: 'outdated', doc: normalizedDoc });
        continue;
      }
    }

    documents.push(normalizedDoc);
  }

  // จำกัดจำนวนเอกสาร
  const limitedDocs = documents.slice(0, opts.maxDocuments);

  // สร้าง context string
  const evidenceParts = [];
  const citations = [];

  let currentLength = 0;

  for (let i = 0; i < limitedDocs.length; i++) {
    const doc = limitedDocs[i];
    const evidenceText = formatDocumentAsEvidence(doc, i);

    // ตรวจสอบความยาว context
    if (currentLength + evidenceText.length > opts.maxLength && evidenceParts.length > 0) {
      skipped.push({ reason: 'context limit', doc });
      continue;
    }

    evidenceParts.push(evidenceText);
    currentLength += evidenceText.length;

    // สร้าง citation หากมี metadata
    if (hasCitableMetadata(doc)) {
      citations.push(buildCitation(doc));
    }
  }

  const context = evidenceParts.join('\n\n---\n\n');

  return {
    context,
    citations,
    hasEvidence: evidenceParts.length > 0,
    hasConflicts: hasConflictingDocuments(limitedDocs),
    hasOutdated: hasOutdated || limitedDocs.some(isOutdated),
    hasBlocked: hasBlocked,
    skipped
  };
}

/**
 * สร้าง conversation context (สั้น ๆ สำหรับ in-context learning)
 *
 * @param {Array<{role: string, content: string}>} history - ประวัติการสนทนา
 * @param {number} [maxMessages=4] - จำนวนข้อความสูงสุด
 * @returns {string}
 */
function buildConversationHistory(history, maxMessages = 4) {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return '';
  }

  const recent = history.slice(-maxMessages);
  const parts = [];

  for (const msg of recent) {
    if (!msg || !msg.role || !msg.content) continue;

    const safeRole = msg.role === 'user' ? 'ผู้ใช้' : 'ผู้ช่วย';
    let content = String(msg.content);
    if (content.length > 500) {
      content = content.substring(0, 497) + '...';
    }
    parts.push(`${safeRole}: ${content}`);
  }

  if (parts.length === 0) return '';

  return 'ประวัติการสนทนาก่อนหน้า:\n' + parts.join('\n') + '\n';
}

module.exports = {
  buildContext,
  buildConversationHistory,
  buildCitation,
  hasCitableMetadata,
  isOutdated,
  isBlockedStatus,
  matchesFiscalYear,
  isSupportedFiscalYear,
  MAX_CONTEXT_LENGTH,
  MAX_DOCUMENTS,
  ACTIVE_STATUSES,
  HISTORICAL_STATUSES,
  BLOCKED_STATUSES,
  SUPPORTED_FISCAL_YEARS,
  // Export สำหรับการทดสอบ
  formatDocumentAsEvidence,
  hasConflictingDocuments
};
