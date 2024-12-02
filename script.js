const DEFAULT_LOOKBACK_MONTHS = 5;
const DEFAULT_DATE_FORMAT = 'YYYY/MM/DD';
const EDITOR_CONFIG = {
    value: "// Generated function code will appear here",
    language: "javascript",
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    formatOnPaste: true,
    formatOnType: true
};
let editor;
// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.1/min/vs' } });
require(['vs/editor/editor.main'], () => {
    editor = monaco.editor.create(document.getElementById('codeEditor'), EDITOR_CONFIG);
});

// loading state handler
function setLoading(isLoading) {
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
        button.disabled = isLoading;
    }
}

// Function to generate the seed function
function generateSeedFunction({ period, baseUrl, urlParameters }) {
    const paramsString = JSON.stringify(urlParameters, null, 4);

    // Generate a complete, valid JavaScript function
    const functionTemplate = `
    // Seed function to fetch data periodically
    function getSeeds() {
        let start = moment().subtract(${DEFAULT_LOOKBACK_MONTHS}, 'months');
        let end = moment();
        const seed = [];
        const baseUrl = '${baseUrl}';
        const urlParameters = ${paramsString};

        if (end.isBefore(start)) {
            [start, end] = [end, start];
        }

        let currentDate = start.clone();
        while (currentDate.isBefore(end) || currentDate.isSame(end)) {
            const periodEnd = currentDate.clone().endOf('${period}').isAfter(end) ? end : currentDate.clone().endOf('${period}');
            const params = new URLSearchParams(urlParameters);
            let startDate = currentDate.format('${DEFAULT_DATE_FORMAT}');
            let endDate = periodEnd.format('${DEFAULT_DATE_FORMAT}');
            const url = \`\${baseUrl}?start=\${startDate}&end=\${endDate}&\${params}\`;
            seed.push(url);

            currentDate.add(1, '${period}').startOf('${period}');
        }

        return seed;
    }`;

    return functionTemplate;
}

// Handle form submission
document.getElementById('generatorForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const baseUrl = document.getElementById('baseUrl').value;
    const period = document.getElementById('period').value;
    let urlParameters;

    try {
        urlParameters = JSON.parse(document.getElementById('urlParams').value || '{}');
    } catch (error) {
        alert("Invalid JSON format for URL parameters.");
        return;
    }

    const generatedCode = generateSeedFunction({ period, baseUrl, urlParameters });
    editor.setValue(generatedCode);
});


// Trigger Monaco Editor's Format Command on Button Click
document.getElementById('formatCodeBtn').addEventListener('click', () => {
    // Use Monaco's built-in formatting action
    editor.getAction('editor.action.formatDocument').run();
});

// Run Code and Capture Output
document.getElementById('runCodeBtn').addEventListener('click', async () => {
    const code = editor.getValue();
    const consoleOutput = document.getElementById('consoleOutput');
    consoleOutput.textContent = "";

    setLoading(true);
    const timestamp = () => new Date().toISOString().split('T')[1].slice(0, -1);

    try {
        // Enhanced sandbox environment
        const sandboxEnv = {
            console: {
                log: (...args) => {
                    consoleOutput.textContent += `[${timestamp()}] ${args.join(' ')}\n`;
                },
                error: (...args) => {
                    consoleOutput.textContent += `[${timestamp()}] ❌ Error: ${args.join(' ')}\n`;
                },
                warn: (...args) => {
                    consoleOutput.textContent += `[${timestamp()}] ⚠️ Warning: ${args.join(' ')}\n`;
                }
            },
            moment: moment.bind(window),
            URL: window.URL,
            URLSearchParams: window.URLSearchParams
        };

        const wrappedCode = `
            try {
                ${code}
                const seeds = getSeeds();
                if (Array.isArray(seeds)) {
                    console.log(\`Found \${seeds.length} seeds:\`);
                    seeds.forEach((seed, index) => console.log(\`[\${index + 1}] \${seed}\`));
                } else {
                    console.warn('getSeeds() did not return an array');
                }
            } catch (e) {
                console.error(e.message);
            }
        `;

        const executeCode = new Function(...Object.keys(sandboxEnv), wrappedCode);
        await executeCode(...Object.values(sandboxEnv));

        consoleOutput.textContent += `[${timestamp()}] ✅ Execution completed successfully\n`;
    } catch (error) {
        consoleOutput.textContent += `[${timestamp()}] ❌ Execution failed: ${error.message}\n`;
    } finally {
        setLoading(false);
    }
});

// Clear console button
document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
    document.getElementById('consoleOutput').textContent = '';
});

// Copy Code
document.getElementById('copyCodeBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(editor.getValue())
        .then(() => alert("Code copied to clipboard!"))
        .catch(err => alert(`Failed to copy code: ${err}`));
});

// Copy Output
document.getElementById('copyOutputBtn').addEventListener('click', () => {
    const output = document.getElementById('consoleOutput').textContent;
    navigator.clipboard.writeText(output)
        .then(() => alert("Output copied to clipboard!"))
        .catch(err => alert(`Failed to copy output: ${err}`));
});

//Auto-save feature
editor.onDidChangeModelContent(debounce(() => {
    localStorage.setItem('lastCode', editor.getValue());
}, 1000));

// Restore last code on load
const lastCode = localStorage.getItem('lastCode');
if (lastCode) {
    editor.setValue(lastCode);
}

// Simple debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
