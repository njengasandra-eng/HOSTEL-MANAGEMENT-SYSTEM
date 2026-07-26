const countBraces = (file) => {
    const fs = require('fs');
    const js = fs.readFileSync(process.env.TEMP + '/' + file, 'utf8');
    let open = 0, close = 0;
    for(let i=0; i<js.length; i++) {
        if(js[i] === '{') open++;
        if(js[i] === '}') close++;
    }
    console.log(file, 'open:', open, 'close:', close);
};
countBraces('allocations_local.js');
countBraces('reports_local.js');
