/**
 * RAG Engine สำหรับ Chatbot ผู้ช่วยอัจฉริยะกลุ่มพัฒนาระบบบริหาร (PSDG)
 * สำนักงานปลัดกระทรวงการคลัง
 * รองรับภาษาไทย: ตัดคำพื้นฐาน + จับ substring + จับ intent
 *
 * ข้อมูลดึงมาจาก knowledge/mof-knowledge.json (ฐานความรู้ PSDG)
 *
 * แก้ไข: เพิ่ม metadata (title, sourceUrl, publisher, documentStatus, fiscal_year)
 * ให้ chunks เพื่อรองรับ citation validation และตอบสนองตามข้อกำหนดของ Prompt Engine
 *
 * หมายเหตุ: การเปลี่ยนแปลงนี้เป็นการปรับข้อมูลและ metadata เท่านั้น — ไม่เปลี่ยน API หรือพฤติกรรมหลัก
 */
const fs = require('fs');
const path = require('path');

const KNOWLEDGE_FILE = path.join(__dirname, '..', 'knowledge', 'mof-knowledge.json');

// คำพ้องและคำย่อที่ใช้จริงในหน่วยงาน
const SYNONYMS = {
  'กพร.': ['PSDG', 'System Development Group', 'กลุ่มพัฒนาระบบบริหาร'],
  'psdg': ['กพร.', 'System Development Group', 'กลุ่มพัฒนาระบบบริหาร'],
  'pmuq': ['PMQA', 'PMQA 4.0', 'การประเมินคุณภาพภาครัฐ'],
  'pmqa': ['PMQA 4.0', 'การประเมินคุณภาพภาครัฐ'],
  'kpi': ['ตัวชี้วัด', 'Key Performance Indicator'],
  'ตัวชี้วัด': ['KPI', 'Key Performance Indicator'],
  'km': ['การจัดการความรู้', 'Knowledge Management'],
  'การจัดการความรู้': ['KM', 'Knowledge Management'],
  'sop': ['คู่มือปฏิบัติงาน', 'Standard Operating Procedure'],
  'คู่มือปฏิบัติงาน': ['SOP', 'Standard Operating Procedure'],
  'e-sar': ['การรายงานผลการปฏิบัติราชการ', 'ระบบรายงานผลการปฏิบัติราชการ'],
  'การรายงานผลการปฏิบัติราชการ': ['e-SAR', 'ระบบรายงานผลการปฏิบัติราชการ'],
  'ความเสี่ยง': ['Risk Management', 'การบริหารความเสี่ยง'],
  'ควบคุมภายใน': ['Internal Control', 'ระบบควบคุมภายใน']
};

class RAGEngine {
    constructor(knowledgeFile) {
        this.knowledgeFile = knowledgeFile || KNOWLEDGE_FILE;
        this.data = this._loadKnowledge();
        this.chunks = this._createChunks();
    }

    _loadKnowledge() {
        const raw = fs.readFileSync(this.knowledgeFile, 'utf-8');
        return JSON.parse(raw);
    }

    _normalizeText(text) {
        if (!text) return '';
        return String(text).toLowerCase().trim();
    }

    _expandWithSynonyms(text) {
        const normalized = this._normalizeText(text);
        let expanded = normalized;
        for (const [key, values] of Object.entries(SYNONYMS)) {
            const keyLower = key.toLowerCase();
            if (normalized.includes(keyLower)) {
                for (const val of values) {
                    expanded += ' ' + val.toLowerCase();
                }
            }
        }
        return expanded;
    }

    _createChunks() {
        const chunks = [];
        const org = this.data.organization || {};
        const baseUrl = org.website || 'https://psdg.mof.go.th/';
        const kmUrl = org.knowledge_center || 'https://km.mof.go.th/';
        const opsplanUrl = org.planning_system || 'https://opsplan.mof.go.th/';
        const catalogUrl = org.catalog || 'https://catalog.mof.go.th/';
        const fySupported = (this.data.fiscal_years && this.data.fiscal_years.supported) || ['2568', '2569', '2570'];
        const fyCurrent = (this.data.fiscal_years && this.data.fiscal_years.current) || '2569';

        // Helper: สร้าง chunk มาตรฐาน
        const addChunk = ({ id, category, keywords, title, content, sourceUrl = baseUrl, publisher = 'กลุ่มพัฒนาระบบบริหาร', documentStatus = 'VERIFIED', fiscalYear = null, section = null }) => {
            const expandedKeywords = [...new Set([...keywords, ...this._getSynonymKeywords(keywords)])];
            chunks.push({
                id,
                category,
                keywords: expandedKeywords,
                title,
                sourceUrl,
                publisher,
                documentStatus,
                fiscalYear,
                section,
                content,
                text: content,
                created_at: new Date().toISOString()
            });
        };

        // 1. ข้อมูลองค์กรและอำนาจหน้าที่
        addChunk({
            id: 'org_profile',
            category: 'organization',
            keywords: ['กลุ่มพัฒนาระบบบริหาร', 'กพร.', 'psdg', 'หน้าที่', 'อำนาจหน้าที่', 'โครงสร้าง', 'ประวัติ', 'วิสัยทัศน์', 'พันธกิจ', 'สังกัด', 'สปก.', 'สำนักงานปลัดกระทรวงการคลัง', 'ช่องทางติดต่อ', 'บทบาท', 'ความรับผิดชอบ'],
            title: 'ข้อมูลองค์กรและอำนาจหน้าที่ กลุ่มพัฒนาระบบบริหาร',
            content: `${org.name_th} (${org.name_en}) ชื่อย่อคือ ${org.abbr_th} หรือ ${org.abbr_en} สังกัด ${org.parent} (${org.parent_en}) ${org.role_th}\n\nอำนาจหน้าที่หลัก:\n${(this.data.authority_and_responsibilities && this.data.authority_and_responsibilities.th) || ''}\n\nที่อยู่: ${org.address}\nโทร: ${org.phone}\nอีเมล: ${org.email}\nสายด่วน: ${org.hotline}\nเว็บไซต์: ${org.website}`,
            fiscalYear: null,
            section: 'องค์กร'
        });

        // 2. วิสัยทัศน์
        addChunk({
            id: 'vision',
            category: 'organization',
            keywords: ['วิสัยทัศน์', 'vision', 'เป้าหมาย'],
            title: 'วิสัยทัศน์ กลุ่มพัฒนาระบบบริหาร',
            content: `วิสัยทัศน์: ${this.data.vision && this.data.vision.text_th}`,
            fiscalYear: null,
            section: 'องค์กร'
        });

        // 3. พันธกิจ
        addChunk({
            id: 'mission',
            category: 'organization',
            keywords: ['พันธกิจ', 'mission', 'หน้าที่'],
            title: 'พันธกิจ กลุ่มพัฒนาระบบบริหาร',
            content: `พันธกิจ: ${this.data.mission && this.data.mission.text_th}`,
            fiscalYear: null,
            section: 'องค์กร'
        });

        // 4. ประเด็นยุทธศาสตร์
        if (this.data.strategic_issues && Array.isArray(this.data.strategic_issues)) {
            for (const issue of this.data.strategic_issues) {
                addChunk({
                    id: `strategy_${issue.id}`,
                    category: 'strategy',
                    keywords: ['ยุทธศาสตร์', 'แผนยุทธศาสตร์', 'พัฒนาระบบราชการ', 'พัฒนาภาครัฐ', 'กลยุทธ์', issue.title_th],
                    title: `ประเด็นยุทธศาสตร์ที่ ${issue.id}: ${issue.title_th}`,
                    content: `ประเด็นยุทธศาสตร์ที่ ${issue.id}: ${issue.title_th} - ${issue.desc_th}`,
                    sourceUrl: opsplanUrl,
                    fiscalYear: null,
                    section: 'ยุทธศาสตร์'
                });
            }
        }

        // 5. PMQA
        addChunk({
            id: 'pmqa_overview',
            category: 'pmqa',
            keywords: ['PMQA', 'PMQA 4.0', 'หมวด PMQA', 'เกณฑ์การประเมิน', 'แบบประเมิน PMQA', 'รายงานผล PMQA', 'หลักฐานประกอบการประเมิน', 'คู่มือ PMQA'],
            title: 'PMQA และ PMQA 4.0 ภาพรวม',
            content: `PMQA (Public Sector Quality Award) คือเกณฑ์การประเมินคุณภาพการบริหารภาครัฐ PMQA 4.0 เป็นเวอร์ชันล่าสุดที่เน้นการพัฒนาระบบราชการให้ทันสมัย โปร่งใส และตรวจสอบได้ กลุ่มพัฒนาระบบบริหารรับผิดชอบการประเมินและสนับสนุนหน่วยงานในสังกัดสำนักงานปลัดกระทรวงการคลังให้ผ่านเกณฑ์ PMQA 4.0`,
            sourceUrl: kmUrl,
            fiscalYear: fyCurrent,
            section: 'PMQA'
        });

        addChunk({
            id: 'pmqa_categories',
            category: 'pmqa',
            keywords: ['หมวด PMQA', 'เกณฑ์ PMQA', 'ประเมิน PMQA', 'คะแนน PMQA'],
            title: 'หมวดการประเมิน PMQA 4.0',
            content: `PMQA 4.0 ประกอบด้วยหมวดการประเมินหลัก ได้แก่ การนำองค์กร การวางแผนยุทธศาสตร์ การให้ความสำคัญกับลูกค้า การวัดการวิเคราะห์และการจัดการความรู้ การมุ่งเน้นทรัพยากรบุคคล การจัดการกระบวนงาน และผลลัพธ์ทางธุรกิจ`,
            sourceUrl: kmUrl,
            fiscalYear: fyCurrent,
            section: 'PMQA'
        });

        // 6. KPI และตัวชี้วัด
        addChunk({
            id: 'kpi_overview',
            category: 'kpi',
            keywords: ['KPI', 'ตัวชี้วัด', 'คำอธิบายตัวชี้วัด', 'เป้าหมาย', 'น้ำหนัก', 'สูตรการคำนวณ', 'เกณฑ์การให้คะแนน', 'ผลการดำเนินงาน', 'ปีงบประมาณ', fyCurrent],
            title: 'ตัวชี้วัดความสำเร็จ (KPI) ประจำปีงบประมาณ ' + fyCurrent,
            content: `ตัวชี้วัดความสำเร็จ (KPI) ของกลุ่มพัฒนาระบบบริหาร ประจำปีงบประมาณ ${fyCurrent} ครอบคลุมด้านการพัฒนาระบบราชการ การบริหารความรู้ การประเมินผล และการให้บริการ แต่ละตัวชี้วัดมีคำอธิบาย เป้าหมาย น้ำหนัก สูตรการคำนวณ และเกณฑ์การให้คะแนนที่ชัดเจน`,
            sourceUrl: opsplanUrl,
            fiscalYear: fyCurrent,
            section: 'KPI'
        });

        addChunk({
            id: 'kpi_fiscal_years',
            category: 'kpi',
            keywords: ['ปีงบประมาณ', '2568', '2569', '2570', 'ข้อมูลย้อนหลัง', 'ปีปัจจุบัน'],
            title: 'ปีงบประมาณที่รองรับ',
            content: `ระบบรองรับข้อมูลปีงบประมาณ ${fySupported.join(', ')} ปีปัจจุบันคือ ${fyCurrent} ข้อมูลปี 2568 ถือเป็นข้อมูลย้อนหลัง ไม่นำข้อมูลปีเก่ามาตอบแทนปีปัจจุบันโดยอัตโนมัติ หากยังไม่มีข้อมูลปีที่ต้องการ ระบบจะแจ้งว่าไม่มีเอกสารที่ยืนยันได้`,
            sourceUrl: opsplanUrl,
            fiscalYear: null,
            section: 'KPI'
        });

        // 7. การปรับปรุงกระบวนงาน
        addChunk({
            id: 'process_improvement',
            category: 'process',
            keywords: ['ปรับปรุงกระบวนงาน', 'วิเคราะห์กระบวนงาน', 'ลดขั้นตอน', 'คู่มือปฏิบัติงาน', 'SOP', 'Work Manual', 'Flowchart'],
            title: 'การปรับปรุงกระบวนงาน',
            content: `การปรับปรุงกระบวนงานเป็นการวิเคราะห์ขั้นตอนการทำงานที่มีอยู่ ระบุจุดที่เกิดความล่าช้าหรือความซ้ำซ้อน แล้วออกแบบขั้นตอนใหม่ให้มีประสิทธิภาพมากขึ้น กลุ่มพัฒนาระบบบริหารจัดทำคู่มือปฏิบัติงานและ SOP เพื่อใช้เป็นแนวทางในการปฏิบัติงานอย่างถูกต้องและเป็นมาตรฐานเดียวกัน`,
            sourceUrl: kmUrl,
            fiscalYear: null,
            section: 'กระบวนงาน'
        });

        // 8. การบริหารความเสี่ยง
        addChunk({
            id: 'risk_management',
            category: 'risk',
            keywords: ['บริหารความเสี่ยง', 'Risk Management', 'Risk Assessment', 'Risk Matrix', 'แผนบริหารความเสี่ยง', 'ติดตามความเสี่ยง', 'ประเมินความเสี่ยง'],
            title: 'การบริหารความเสี่ยง',
            content: `การบริหารความเสี่ยงคือกระบวนการระบุ วิเคราะห์ ประเมิน และจัดการความเสี่ยงที่อาจส่งผลต่อการดำเนินงานของกลุ่ม Risk Matrix ใช้เป็นเครื่องมือในการจัดลำดับความสำคัญของความเสี่ยงตามโอกาสเกิดและผลกระทบ กลุ่มพัฒนาระบบบริหารจัดทำแผนบริหารความเสี่ยงและติดตามอย่างสม่ำเสมอ`,
            sourceUrl: kmUrl,
            fiscalYear: null,
            section: 'ความเสี่ยง'
        });

        // 9. การควบคุมภายใน
        addChunk({
            id: 'internal_control',
            category: 'internal_control',
            keywords: ['ควบคุมภายใน', 'Internal Control', 'ระบบควบคุมภายใน', 'หลักเกณฑ์ควบคุมภายใน', 'รายงานควบคุมภายใน'],
            title: 'ระบบควบคุมภายใน',
            content: `ระบบควบคุมภายในเป็นกลไกสำคัญในการกำกับดูแลให้การดำเนินงานของหน่วยงานเป็นไปตามกฎหมาย ระเบียบ และข้อบังคับ กลุ่มพัฒนาระบบบริหารจัดทำรายงานควบคุมภายในและประเมินประสิทธิภาพของระบบควบคุมภายในเป็นประจำ`,
            sourceUrl: kmUrl,
            fiscalYear: null,
            section: 'ควบคุมภายใน'
        });

        // 10. การจัดการความรู้ (KM)
        addChunk({
            id: 'km_overview',
            category: 'km',
            keywords: ['KM', 'การจัดการความรู้', 'Knowledge Management', 'Knowledge Bank', 'ตู้สาระ', 'Information Cabinet', 'แผน KM', 'คลังความรู้', 'ศูนย์ความรู้'],
            title: 'การจัดการความรู้ (KM) ของกลุ่ม',
            content: `กลุ่มพัฒนาระบบบริหารดำเนินการจัดการความรู้ผ่านคลังความรู้ (Knowledge Bank) และตู้สาระ (Information Cabinet) รวบรวมเอกสาร คู่มือ องค์ความรู้ กฎหมายและระเบียบ และผลงานเพื่อให้บุคลากรและประชาชนค้นหาและใช้ประโยชน์ได้สะดวก มีแผน KM ประจำปีและกิจกรรม KM อย่างต่อเนื่อง`,
            sourceUrl: kmUrl,
            fiscalYear: null,
            section: 'KM'
        });

        // 11. ความพึงพอใจของผู้รับบริการ
        addChunk({
            id: 'service_satisfaction',
            category: 'satisfaction',
            keywords: ['ความพึงพอใจ', 'สำรวจความพึงพอใจ', 'แบบสอบถาม', 'ข้อเสนอแนะ', 'ปรับปรุงบริการ', 'ผลสำรวจ', 'รายงานผลสำรวจ', fyCurrent],
            title: 'การสำรวจความพึงพอใจผู้รับบริการ',
            content: `กลุ่มพัฒนาระบบบริหารจัดทำแบบสอบถามความพึงพอใจเพื่อรับข้อเสนอแนะจากผู้รับบริการ และนำผลการสำรวจมาปรับปรุงการให้บริการให้ดียิ่งขึ้น รายงานผลการสำรวจจัดทำเป็นประจำทุกปีงบประมาณ`,
            sourceUrl: kmUrl,
            fiscalYear: fyCurrent,
            section: 'ความพึงพอใจ'
        });

        // 12. เอกสารและโครงการ
        addChunk({
            id: 'documents_projects',
            category: 'documents',
            keywords: ['คู่มือ', 'เอกสาร', 'โครงการพิเศษ', 'รายงานผล', 'แผนงาน', 'กฎหมาย', 'ระเบียบ', 'คำสั่ง', 'หนังสือเวียน', 'PDF', 'ดาวน์โหลดเอกสาร', 'สืบค้นเอกสาร'],
            title: 'เอกสารและโครงการพัฒนาระบบราชการ',
            content: `กลุ่มพัฒนาระบบบริหารจัดทำเอกสารต่างๆ ได้แก่ คู่มือปฏิบัติงาน รายงานผลการดำเนินงานรายไตรมาสและรายปี เอกสารเกี่ยวกับ PMQA โครงการพัฒนาระบบราชการ กฎหมาย ระเบียบ คำสั่ง และหนังสือเวียน สามารถสืบค้นและดาวน์โหลดได้จากเว็บไซต์ทางการและคลังความรู้`,
            sourceUrl: catalogUrl,
            fiscalYear: null,
            section: 'เอกสาร'
        });

        // 13. ช่องทางติดต่อ
        addChunk({
            id: 'org_contact',
            category: 'contact',
            keywords: ['ติดต่อ', 'เบอร์', 'โทร', 'อีเมล', 'email', 'ที่อยู่', 'address', 'สายด่วน', '1689', 'เว็บไซต์', 'ช่องทางติดต่อ'],
            title: 'ข้อมูลการติดต่อ กลุ่มพัฒนาระบบบริหาร',
            content: `ช่องทางการติดต่อ กลุ่มพัฒนาระบบบริหาร สำนักงานปลัดกระทรวงการคลัง:\n- ที่อยู่: ${org.address}\n- เบอร์โทรศัพท์: ${org.phone}\n- อีเมล: ${org.email}\n- สายด่วน: ${org.hotline}\n- เว็บไซต์: ${org.website}\n- คลังความรู้: ${kmUrl}`,
            fiscalYear: null,
            section: 'ติดต่อ'
        });

        // 14. การทักทาย
        addChunk({
            id: 'greeting',
            category: 'chat',
            keywords: ['สวัสดี', 'หวัดดี', 'hello', 'hi', 'ทักทาย', 'สบายดีไหม'],
            title: 'การทักทาย',
            content: `สวัสดีครับ! ผมคือ PSDG Smart Assistant ผู้ช่วยข้อมูลด้านการพัฒนาระบบราชการของกลุ่มพัฒนาระบบบริหาร สำนักงานปลัดกระทรวงการคลัง ยินดีให้บริการข้อมูลเกี่ยวกับภารกิจของกลุ่ม PMQA KPI การประเมินผล การพัฒนาระบบราชการ การปรับปรุงกระบวนงาน การบริหารความเสี่ยง การควบคุมภายใน การจัดการความรู้ และรายงานเอกสารราชการ ถามมาได้เลยครับ`,
            fiscalYear: null,
            section: 'ทั่วไป'
        });

        // แปลง text → content สำหรับ compatibility กับโค้ดเดิม
        for (const chunk of chunks) {
            if (chunk.text && !chunk.content) {
                chunk.content = chunk.text;
            }
            chunk.text = chunk.content;
        }

        return chunks;
    }

    _getSynonymKeywords(keywords) {
        const expanded = [];
        for (const kw of keywords) {
            const kwLower = this._normalizeText(kw);
            if (SYNONYMS[kwLower]) {
                expanded.push(...SYNONYMS[kwLower]);
            }
        }
        return expanded;
    }

    classifyIntent(query) {
        const q = this._normalizeText(query);

        // 1. ตรวจสอบจาก keywords ของแต่ละ chunk ก่อน (ใช้ category เป็น hint)
        let firstMatchCategory = null;
        let kmMatched = false;
        for (const chunk of this.chunks) {
            if (chunk.keywords) {
                for (const kw of chunk.keywords) {
                    if (q.includes(this._normalizeText(kw))) {
                        if (!firstMatchCategory) firstMatchCategory = chunk.category;
                        if (chunk.category === 'km') kmMatched = true;
                    }
                }
            }
        }
        if (kmMatched) return 'km';
        if (firstMatchCategory) return firstMatchCategory;

        // 2. ตรวจสอบจาก keyword dictionaries ที่ขยายด้วยคำพ้อง
        const keywords = {
            km: ['KM', 'การจัดการความรู้', 'Knowledge Management', 'Knowledge Bank', 'ตู้สาระ', 'แผน KM', 'ศูนย์ความรู้', 'คลังความรู้'],
            organization: ['กลุ่มพัฒนาระบบบริหาร', 'กพร.', 'psdg', 'หน้าที่', 'อำนาจหน้าที่', 'สปก.', 'สำนักงานปลัดกระทรวงการคลัง', 'วิสัยทัศน์', 'พันธกิจ', 'ช่องทางติดต่อ'],
            strategy: ['ยุทธศาสตร์', 'แผนยุทธศาสตร์', 'พัฒนาระบบราชการ', 'พัฒนาภาครัฐ', 'กลยุทธ์', 'แผนปฏิบัติราชการ'],
            pmqa: ['PMQA', 'PMQA 4.0', 'หมวด PMQA', 'เกณฑ์การประเมิน', 'แบบประเมิน PMQA'],
            kpi: ['KPI', 'ตัวชี้วัด', 'เป้าหมาย', 'น้ำหนัก', 'ผลการดำเนินงาน', 'ปีงบประมาณ'],
            process: ['ปรับปรุงกระบวนงาน', 'คู่มือปฏิบัติงาน', 'SOP', 'Flowchart', 'ลดขั้นตอน'],
            risk: ['บริหารความเสี่ยง', 'Risk Matrix', 'แผนบริหารความเสี่ยง', 'ประเมินความเสี่ยง'],
            internal_control: ['ควบคุมภายใน', 'Internal Control', 'ระบบควบคุมภายใน', 'รายงานควบคุมภายใน'],
            satisfaction: ['ความพึงพอใจ', 'สำรวจความพึงพอใจ', 'แบบสอบถาม', 'ข้อเสนอแนะ'],
            documents: ['คู่มือ', 'เอกสาร', 'โครงการพิเศษ', 'รายงานผล', 'PDF', 'สืบค้นเอกสาร'],
            contact: ['ติดต่อ', 'เบอร์', 'โทร', 'อีเมล', 'ที่อยู่', 'สายด่วน'],
            chat: ['สวัสดี', 'หวัดดี', 'hello', 'hi', 'ทักทาย']
        };

        for (const [intent, kws] of Object.entries(keywords)) {
            if (kws.some(kw => q.includes(this._normalizeText(kw)))) {
                return intent;
            }
        }

        return 'general';
    }

    searchChunks(query, topK = 3) {
        const q = this._normalizeText(query);
        const scored = [];

        for (const chunk of this.chunks) {
            let score = 0;
            const textLower = this._normalizeText(chunk.text);

            // 1. ตรวจว่า query ทั้งประโยค หรือส่วนหนึ่ง มีอยู่ใน text ไหม
            if (textLower.includes(q)) {
                score += 10;
            }

            // 2. ตรวจ keywords ของ chunk (รวมคำพ้อง)
            if (chunk.keywords) {
                for (const kw of chunk.keywords) {
                    const kwLower = this._normalizeText(kw);
                    if (q.includes(kwLower) || kwLower.includes(q)) {
                        score += 5;
                    }
                    const kwTokens = kwLower.split(/[\s.]+/).filter(t => t.length >= 2);
                    for (const kwt of kwTokens) {
                        if (q.includes(kwt)) {
                            score += 3;
                        }
                    }
                }
            }

            // 3. ตรวจคำเดี่ยวๆ ที่ผู้ใช้พิมพ์
            const tokens = q.split(/[\s,./?!=+-]+/).filter(t => t.length >= 2);
            for (const token of tokens) {
                if (textLower.includes(token)) {
                    score += 2;
                }
            }

            if (score > 0) {
                scored.push({ score, chunk });
            }
        }

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK).map(s => s.chunk);
    }

    answer(query) {
        const intent = this.classifyIntent(query);
        let matches = this.searchChunks(query);

        // ถ้า intent เป็น chat แต่ไม่เจอ match ให้ดึง greeting chunk
        if (intent === 'chat' && matches.length === 0) {
            const greeting = this.chunks.find(c => c.id === 'greeting');
            if (greeting) matches = [greeting];
        }

        // ถ้า intent เป็น contact แต่ไม่เจอ match ให้ดึง contact chunk
        if (intent === 'contact' && matches.length === 0) {
            const contact = this.chunks.find(c => c.id === 'org_contact');
            if (contact) matches = [contact];
        }

        return { intent, matches, query };
    }

    extractAnswer(query, intent) {
        const { matches } = this.answer(query);

        if (!matches || matches.length === 0) {
            return 'ขออภัยครับ ยังไม่พบข้อมูลที่ตรงกับคำถามนี้ในฐานความรู้ของกลุ่มพัฒนาระบบบริหาร\n\nท่านสามารถติดต่อสอบถามเจ้าหน้าที่กลุ่มพัฒนาระบบบริหาร ได้โดยตรงที่:\n📞 โทร: 02-126-5800, 02-273-9408\n📧 อีเมล: saraban@mof.go.th\n📞 สายด่วน: 1689\n🌐 เว็บไซต์: https://psdg.mof.go.th/';
        }

        const texts = matches.map(m => m.text);
        let answer = texts.join('\n\n');

        if (intent === 'contact' && !answer.includes('02-126-5800')) {
            answer += '\n\n📞 โทร: 02-126-5800, 02-273-9408 | Fax: 02-273-9408 | สายด่วน: 1689';
        }

        return answer;
    }

    /**
     * แปลง chunks เป็น RetrievedDocument format ที่ PromptEngine ต้องการ
     * เพิ่ม metadata ที่มีอยู่ (title, sourceUrl, publisher, documentStatus, fiscalYear)
     *
     * @param {Array} chunks - ผลลัพธ์จาก searchChunks()
     * @returns {Array<Object>} retrievedDocuments ในรูปแบบที่ ContextBuilder ต้องการ
     */
    chunksToRetrievedDocuments(chunks) {
        if (!chunks || !Array.isArray(chunks)) {
            return [];
        }

        return chunks.map(chunk => ({
            documentId: chunk.id,
            content: chunk.text || chunk.content,
            title: chunk.title || null,
            sourceUrl: chunk.sourceUrl || null,
            publisher: chunk.publisher || null,
            publishedDate: chunk.created_at || null,
            effectiveDate: null,
            updatedAt: chunk.created_at || null,
            documentStatus: chunk.documentStatus || 'VERIFIED',
            fiscalYear: chunk.fiscalYear || null,
            pageNumber: null,
            sectionTitle: chunk.section || null,
            retrievalScore: null
        }));
    }

    /**
     * เพิ่ม chunks ใหม่เข้าไปในฐานความรู้แบบ real-time (ไม่ต้องรีสตาร์ทเซิร์ฟเวอร์)
     *
     * @param {Array<Object>} newChunks - รายการ chunks ใหม่
     * @returns {Array<Object>} chunks ทั้งหมดใน engine หลังจากเพิ่มแล้ว
     */
    addChunks(newChunks) {
        if (!Array.isArray(newChunks) || newChunks.length === 0) {
            return this.chunks;
        }

        for (const chunk of newChunks) {
            if (chunk.text && !chunk.content) {
                chunk.content = chunk.text;
            }
            chunk.text = chunk.content;
            if (!chunk.documentStatus) {
                chunk.documentStatus = 'UNVERIFIED';
            }
            if (!chunk.fiscalYear) {
                chunk.fiscalYear = null;
            }
        }

        this.chunks.push(...newChunks);
        return this.chunks;
    }

    /**
     * ลบ chunk ออกจาก engine ตาม id
     *
     * @param {string} chunkId - รหัส chunk ที่ต้องการลบ
     * @returns {boolean} true ถ้าลบสำเร็จ, false ถ้าไม่พบ
     */
    removeChunk(chunkId) {
        const before = this.chunks.length;
        this.chunks = this.chunks.filter(c => c.id !== chunkId);
        return this.chunks.length < before;
    }
}

module.exports = RAGEngine;
