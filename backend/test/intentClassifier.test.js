/**
 * ทดสอบ IntentClassifier
 * ครอบคลุมทุกหมวดหมู่ที่รองรับ (12 intents ตามข้อกำหนด PSDG)
 */

'use strict';

const assert = require('assert');
const { classifyIntent, isValidIntent, getValidIntents } = require('../intentClassifier');

// ทดสอบ 12 intent หลักตามข้อกำหนด PSDG
const intentTests = [
    {
        name: 'ORGANIZATION_PROFILE',
        message: 'กลุ่มพัฒนาระบบบริหารมีหน้าที่อะไรบ้าง',
        expected: 'ORGANIZATION_PROFILE'
    },
    {
        name: 'ORGANIZATION_PROFILE (วิสัยทัศน์)',
        message: 'มีวิสัยทัศน์อะไรบ้าง',
        expected: 'ORGANIZATION_PROFILE'
    },
    {
        name: 'ORGANIZATION_PROFILE (กพร.)',
        message: 'กพร. คืออะไร',
        expected: 'ORGANIZATION_PROFILE'
    },
    {
        name: 'STRATEGY_AND_DEVELOPMENT',
        message: 'ยุทธศาสตร์การพัฒนาระบบราชการมีอะไรบ้าง',
        expected: 'STRATEGY_AND_DEVELOPMENT'
    },
    {
        name: 'STRATEGY_AND_DEVELOPMENT (แผน)',
        message: 'แผนปฏิบัติราชการปี 2569',
        expected: 'STRATEGY_AND_DEVELOPMENT'
    },
    {
        name: 'PMQA',
        message: 'PMQA 4.0 คืออะไร',
        expected: 'PMQA'
    },
    {
        name: 'PMQA (เกณฑ์)',
        message: 'เกณฑ์การประเมิน PMQA มีอะไรบ้าง',
        expected: 'PMQA'
    },
    {
        name: 'PERFORMANCE_AND_KPI',
        message: 'KPI ปี 2569 มีอะไรบ้าง',
        expected: 'PERFORMANCE_AND_KPI'
    },
    {
        name: 'PERFORMANCE_AND_KPI (ตัวชี้วัด)',
        message: 'ตัวชี้วัดความสำเร็จมีอะไรบ้าง',
        expected: 'PERFORMANCE_AND_KPI'
    },
    {
        name: 'PROCESS_IMPROVEMENT',
        message: 'คู่มือปฏิบัติงาน SOP มีอะไรบ้าง',
        expected: 'PROCESS_IMPROVEMENT'
    },
    {
        name: 'PROCESS_IMPROVEMENT (ลดขั้นตอน)',
        message: 'ปรับปรุงกระบวนงานลดขั้นตอน',
        expected: 'PROCESS_IMPROVEMENT'
    },
    {
        name: 'RISK_MANAGEMENT',
        message: 'Risk Matrix การบริหารความเสี่ยง',
        expected: 'RISK_MANAGEMENT'
    },
    {
        name: 'RISK_MANAGEMENT (แผน)',
        message: 'แผนบริหารความเสี่ยงปี 2569',
        expected: 'RISK_MANAGEMENT'
    },
    {
        name: 'INTERNAL_CONTROL',
        message: 'ระบบควบคุมภายใน มีเกณฑ์อะไรบ้าง',
        expected: 'INTERNAL_CONTROL'
    },
    {
        name: 'KNOWLEDGE_MANAGEMENT',
        message: 'การจัดการความรู้ KM Knowledge Bank',
        expected: 'KNOWLEDGE_MANAGEMENT'
    },
    {
        name: 'SERVICE_SATISFACTION',
        message: 'สำรวจความพึงพอใจผู้รับบริการ',
        expected: 'SERVICE_SATISFACTION'
    },
    {
        name: 'DOCUMENTS_AND_PROJECTS',
        message: 'เอกสาร คู่มือ รายงานราชการ PDF',
        expected: 'DOCUMENTS_AND_PROJECTS'
    },
    {
        name: 'OUT_OF_SCOPE',
        message: 'ทำนายลางอนาคตฉันเป็นอย่างไร',
        expected: 'OUT_OF_SCOPE'
    },
    {
        name: 'INSUFFICIENT_INFORMATION',
        message: 'x9k2j3',
        expected: 'INSUFFICIENT_INFORMATION'
    }
];

function runTests() {
    let passed = 0;
    let failed = 0;

    console.log('=== ทดสอบ IntentClassifier ===\n');

    // ทดสอบ 12 intent หลัก
    for (const test of intentTests) {
        try {
            const result = classifyIntent(test.message, [], 'th');
            assert.strictEqual(result, test.expected,
                `Expected: ${test.expected}, Got: ${result}, Message: "${test.message}"`);
            console.log(`  ✅ ${test.name}: "${test.message}" -> ${result}`);
            passed++;
        } catch (err) {
            console.log(`  ❌ ${test.name}: ${err.message}`);
            failed++;
        }
    }

    // ทดสอบภาษาอังกฤษ
    try {
        const result = classifyIntent('What is PSDG?', [], 'en');
        assert.strictEqual(result, 'ORGANIZATION_PROFILE');
        console.log(`  ✅ English classification: "What is PSDG?" -> ${result}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ English classification: ${err.message}`);
        failed++;
    }

    // ทดสอบค่าว่าง
    try {
        const result = classifyIntent('');
        assert.strictEqual(result, 'INSUFFICIENT_INFORMATION');
        console.log(`  ✅ Empty message: "" -> ${result}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ Empty message: ${err.message}`);
        failed++;
    }

    try {
        const result = classifyIntent(null);
        assert.strictEqual(result, 'INSUFFICIENT_INFORMATION');
        console.log(`  ✅ Null message: null -> ${result}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ Null message: ${err.message}`);
        failed++;
    }

    try {
        const result = classifyIntent('   ');
        assert.strictEqual(result, 'INSUFFICIENT_INFORMATION');
        console.log(`  ✅ Whitespace message: "   " -> ${result}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ Whitespace message: ${err.message}`);
        failed++;
    }

    // ทดสอบ isValidIntent
    try {
        assert.strictEqual(isValidIntent('ORGANIZATION_PROFILE'), true);
        assert.strictEqual(isValidIntent('INVALID_INTENT'), false);
        assert.strictEqual(isValidIntent(null), false);
        assert.strictEqual(isValidIntent('GENERAL_GREETING'), false);
        console.log(`  ✅ isValidIntent validation works`);
        passed++;
    } catch (err) {
        console.log(`  ❌ isValidIntent validation: ${err.message}`);
        failed++;
    }

    // ทดสอบ getValidIntents
    try {
        const intents = getValidIntents();
        assert.strictEqual(intents.length, 12);
        assert.ok(intents.includes('ORGANIZATION_PROFILE'));
        assert.ok(intents.includes('PMQA'));
        assert.ok(intents.includes('OUT_OF_SCOPE'));
        assert.ok(intents.includes('INSUFFICIENT_INFORMATION'));
        console.log(`  ✅ getValidIntents returns ${intents.length} intents`);
        passed++;
    } catch (err) {
        console.log(`  ❌ getValidIntents: ${err.message}`);
        failed++;
    }

    console.log(`\n=== สรุป ===`);
    console.log(`ผ่าน: ${passed}, ล้มเหลว: ${failed}`);
    console.log(`ผลลัพธ์: ${failed === 0 ? 'PASS' : 'FAIL'}\n`);

    return { passed, failed };
}

// รันเฉพาะเมื่อเรียกโดยตรง
if (require.main === module) {
    runTests();
}

module.exports = { runTests };
