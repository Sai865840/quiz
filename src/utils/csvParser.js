/**
 * Parse CSV text into question objects
 *
 * Expected CSV format (with header row):
 * question,optionA,optionB,optionC,optionD,correctOption,explanation,important
 *
 * - correctOption should be one of: A, B, C, D
 * - important is optional (true/false), defaults to false
 * - explanation is optional
 *
 * Also supports tab-separated values (TSV)
 */
export function parseCSV(text) {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length < 2) {
        return { valid: [], errors: ['File must have a header row and at least one data row.'] };
    }

    // Detect delimiter (comma or tab)
    const delimiter = lines[0].includes('\t') ? '\t' : ',';

    // Parse header to determine column mapping
    const header = parseLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());

    const columnMap = {
        question: findColumn(header, ['question', 'text', 'q']),
        optionA: findColumn(header, ['optiona', 'option_a', 'a', 'opt_a', 'option a']),
        optionB: findColumn(header, ['optionb', 'option_b', 'b', 'opt_b', 'option b']),
        optionC: findColumn(header, ['optionc', 'option_c', 'c', 'opt_c', 'option c']),
        optionD: findColumn(header, ['optiond', 'option_d', 'd', 'opt_d', 'option d']),
        correct: findColumn(header, ['correctoption', 'correct_option', 'correct', 'answer', 'correctanswer', 'correct_answer']),
        explanation: findColumn(header, ['explanation', 'explain', 'solution']),
        important: findColumn(header, ['important', 'imp', 'priority']),
    };

    // Validate required columns exist
    const missing = [];
    if (columnMap.question === -1) missing.push('question');
    if (columnMap.optionA === -1) missing.push('optionA');
    if (columnMap.optionB === -1) missing.push('optionB');
    if (columnMap.optionC === -1) missing.push('optionC');
    if (columnMap.optionD === -1) missing.push('optionD');
    if (columnMap.correct === -1) missing.push('correctOption');

    if (missing.length > 0) {
        return {
            valid: [],
            errors: [`Missing required columns: ${missing.join(', ')}. Expected: question, optionA, optionB, optionC, optionD, correctOption`],
        };
    }

    const valid = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i], delimiter);
        const rowNum = i + 1;

        const questionText = (cols[columnMap.question] || '').trim();
        const optA = (cols[columnMap.optionA] || '').trim();
        const optB = (cols[columnMap.optionB] || '').trim();
        const optC = (cols[columnMap.optionC] || '').trim();
        const optD = (cols[columnMap.optionD] || '').trim();
        const correct = (cols[columnMap.correct] || '').trim().toUpperCase();
        const explanation = columnMap.explanation !== -1 ? (cols[columnMap.explanation] || '').trim() : '';
        const importantRaw = columnMap.important !== -1 ? (cols[columnMap.important] || 'false').trim().toLowerCase() : 'false';
        const important = ['true', '1', 'yes', 'y'].includes(importantRaw);

        // Validate
        if (!questionText) {
            errors.push(`Row ${rowNum}: Missing question text`);
            continue;
        }
        if (!optA || !optB || !optC || !optD) {
            errors.push(`Row ${rowNum}: Missing one or more options`);
            continue;
        }
        if (!['A', 'B', 'C', 'D'].includes(correct)) {
            errors.push(`Row ${rowNum}: correctOption must be A, B, C, or D (got "${correct}")`);
            continue;
        }

        valid.push({
            text: questionText,
            options: [
                { label: 'A', text: optA },
                { label: 'B', text: optB },
                { label: 'C', text: optC },
                { label: 'D', text: optD },
            ],
            correctOption: correct,
            explanation,
            important,
        });
    }

    return { valid, errors };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseLine(line, delimiter = ',') {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

/**
 * Find column index from possible header names
 */
function findColumn(headers, possibleNames) {
    for (const name of possibleNames) {
        const idx = headers.indexOf(name);
        if (idx !== -1) return idx;
    }
    return -1;
}

/**
 * Generate a sample CSV template string
 */
export function getSampleCSV() {
    return `question,optionA,optionB,optionC,optionD,correctOption,explanation,important
"What is the capital of France?","Berlin","Madrid","Paris","Rome","C","Paris is the capital of France","true"
"What is 2 + 2?","3","4","5","6","B","Basic arithmetic","false"`;
}
