const fs = require('fs');
const js = fs.readFileSync(process.env.TEMP + '/students_local.js', 'utf8');
const lines = js.split('\n');
let pStack = [];
let bStack = [];
let inString = false;
let stringChar = '';
for (let i = 0; i < js.length; i++) {
    const c = js[i];
    let lineNo = js.substring(0, i).split('\n').length;
    if (inString) {
        if (c === stringChar && js[i-1] !== '\\') inString = false;
    } else {
        if (c === '"' || c === "'" || c === '') { inString = true; stringChar = c; }
        else if (c === '(') pStack.push(lineNo);
        else if (c === ')') pStack.pop();
        else if (c === '{') bStack.push(lineNo);
        else if (c === '}') bStack.pop();
    }
}
console.log('Unclosed parenthesis at lines:', pStack);
console.log('Unclosed braces at lines:', bStack);
