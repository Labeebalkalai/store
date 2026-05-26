const fs = require('fs');

const content = fs.readFileSync('general_store/js/main.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('_transactionsListener')) {
        console.log(`_transactionsListener found on line ${index+1}: ${line.trim()}`);
        // print next 25 lines
        for (let j = index; j < index + 25; j++) {
            if (lines[j]) console.log(`${j+1}: ${lines[j]}`);
        }
    }
});
