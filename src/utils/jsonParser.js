export function parseJSON(text) {
    try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
            return { valid: [], errors: ['JSON content must be an array of question objects.'] };
        }

        const valid = [];
        const errors = [];

        data.forEach((item, index) => {
            const rowNum = index + 1;

            const questionText = (item.question || item.text || '').trim();
            const optA = (item.optionA || item.a || item.option_a || '').trim();
            const optB = (item.optionB || item.b || item.option_b || '').trim();
            const optC = (item.optionC || item.c || item.option_c || '').trim();
            const optD = (item.optionD || item.d || item.option_d || '').trim();
            const correctRaw = (item.correctOption || item.correct || item.answer || '');
            const correct = String(correctRaw).trim().toUpperCase();
            const explanation = (item.explanation || item.explain || item.solution || '').trim();

            let important = false;
            const importantRaw = item.important;
            if (typeof importantRaw === 'boolean') {
                important = importantRaw;
            } else if (typeof importantRaw === 'string') {
                important = ['true', '1', 'yes', 'y'].includes(importantRaw.trim().toLowerCase());
            }

            if (!questionText) {
                errors.push(`Item ${rowNum}: Missing question text`);
                return;
            }
            if (!optA || !optB || !optC || !optD) {
                errors.push(`Item ${rowNum}: Missing one or more options`);
                return;
            }
            if (!['A', 'B', 'C', 'D'].includes(correct)) {
                errors.push(`Item ${rowNum}: correctOption must be A, B, C, or D (got "${correct}")`);
                return;
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
        });

        if (valid.length === 0 && errors.length === 0) {
            errors.push('No questions found in JSON array.');
        }

        return { valid, errors };

    } catch (err) {
        return { valid: [], errors: ['Invalid JSON format: ' + err.message] };
    }
}

export function getSampleJSON() {
    const sample = [
        {
            "question": "What is the capital of France?",
            "optionA": "Berlin",
            "optionB": "Madrid",
            "optionC": "Paris",
            "optionD": "Rome",
            "correctOption": "C",
            "explanation": "Paris is the capital of France",
            "important": true
        },
        {
            "question": "What is 2 + 2?",
            "optionA": "3",
            "optionB": "4",
            "optionC": "5",
            "optionD": "6",
            "correctOption": "B",
            "explanation": "Basic arithmetic",
            "important": false
        }
    ];
    return JSON.stringify(sample, null, 4);
}
