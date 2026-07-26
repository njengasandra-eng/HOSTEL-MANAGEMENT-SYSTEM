const fs = require('fs');
const esprima = require('esprima');
const getUnclosed = (file) => {
    const js = fs.readFileSync(process.env.TEMP + '/' + file, 'utf8') + '\n}';
    const ast = esprima.parseScript(js, { loc: true });
    let unclosed = null;
    ast.body.forEach(node => {
        if (node.type === 'FunctionDeclaration') {
            if (!unclosed || node.loc.end.line > unclosed.loc.end.line) {
                unclosed = node;
            }
        }
    });
    console.log(file, 'unclosed function:', unclosed ? unclosed.id.name + ' ends at ' + unclosed.loc.end.line : 'none');
};
getUnclosed('allocations_local.js');
getUnclosed('reports_local.js');
