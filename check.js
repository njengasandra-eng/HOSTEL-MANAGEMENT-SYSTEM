const fs = require('fs');
const esprima = require('esprima');
const js = fs.readFileSync(process.env.TEMP + '/students_local.js', 'utf8') + '\n}';
try {
    esprima.parseScript(js);
    console.log('Pass with one brace');
} catch(e) {
    console.log('Failed with one brace:', e.description);
}
