const fs = require('fs');
const esprima = require('esprima');
const js = fs.readFileSync(process.env.TEMP + '/students_local.js', 'utf8');
const lines = js.split('\n');
for(let i=lines.length; i>0; i--) {
    let part = lines.slice(0, i).join('\n') + '\n}';
    try {
        esprima.parseScript(part);
        console.log('Error started between line', i-10, 'and', i);
        break;
    } catch(e) { }
}
