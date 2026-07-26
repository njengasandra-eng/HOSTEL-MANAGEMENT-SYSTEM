const fs = require('fs');
const esprima = require('esprima');
const js = fs.readFileSync(process.env.TEMP + '/students_local.js', 'utf8');
try {
    esprima.parseScript(js, { tolerant: true });
} catch (e) {
    console.log(e);
}
