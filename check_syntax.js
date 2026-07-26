const fs = require('fs');
const esprima = require('esprima');
const js = fs.readFileSync(process.env.TEMP + '/students_local.js', 'utf8');
try {
    esprima.parseScript(js);
    console.log('No syntax error');
} catch (e) {
    console.log('Syntax error at line', e.lineNumber, ':', e.description);
}
