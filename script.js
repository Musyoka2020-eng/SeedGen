let editor;
// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.1/min/vs' } });
require(['vs/editor/editor.main'], () => {
    editor = monaco.editor.create(document.getElementById('codeEditor'), {
        value: "// Generated function code will appear here",
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true,
    });
});

// Function to generate the seed function
function generateSeedFunction({ period, baseUrl, urlParameters }) {
    const paramsString = JSON.stringify(urlParameters, null, 4);

    const functionTemplate = `function getSeeds() {
        let start = moment().subtract(5, 'months');
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
            params.set('start', currentDate.format('YYYY/MM/DD'));
            params.set('end', periodEnd.format('YYYY/MM/DD'));

            const url = \`\${baseUrl}?\${params.toString()}\`;
            seed.push(url);

            currentDate.add(1, '${period}').startOf('${period}');
        }

        return seed;
    }
    `;
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

// Install NPM Module dynamically
document.getElementById('installModuleBtn').addEventListener('click', async () => {
    const moduleName = prompt("Enter the NPM module name:");
    if (!moduleName) return;

    try {
        const moduleUrl = `https://cdn.jsdelivr.net/npm/${moduleName}`;
        await import(moduleUrl);
        alert(`${moduleName} module installed successfully!`);
    } catch (error) {
        alert(`Failed to install module: ${error.message}`);
    }
});

// Trigger Monaco Editor's Format Command on Button Click
document.getElementById('formatCodeBtn').addEventListener('click', () => {
    // Use Monaco's built-in formatting action
    editor.getAction('editor.action.formatDocument').run();
});

// Run Code and Capture Output
document.getElementById('runCodeBtn').addEventListener('click', () => {
    const code = document.getElementById('codeEditor').value;
    const consoleOutput = document.getElementById('consoleOutput');
    consoleOutput.textContent = "";

    // Add timestamp to logging
    const timestamp = () => new Date().toISOString().split('T')[1].slice(0, -1);

    // Create sandbox environment with limited scope
    const sandboxEnv = {
        console: {
            log: (...args) => {
                consoleOutput.textContent += `[${timestamp()}] ${args.join(' ')}\n`;
            },
            error: (...args) => {
                consoleOutput.textContent += `[${timestamp()}] Error: ${args.join(' ')}\n`;
            },
            warn: (...args) => {
                consoleOutput.textContent += `[${timestamp()}] Warning: ${args.join(' ')}\n`;
            }
        },
        // Add other safe APIs here
        Math: Math,
        Date: Date,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Error: Error,
        undefined: undefined,
        null: null
    };

    try {
        // Set execution timeout
        const timeoutDuration = 10000; // 5 seconds
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Execution timed out')), timeoutDuration);
        });

        // Wrap code execution in async function to enable timeout
        const executeCode = async () => {
            consoleOutput.textContent += `[${timestamp()}] Starting code execution...\n`;
            const sandboxFunction = new Function(
                ...Object.keys(sandboxEnv),
                code
            );

            // Execute in sandbox
            return sandboxFunction(...Object.values(sandboxEnv));
        };

        // Run code with timeout
        Promise.race([executeCode(), timeoutPromise])
            .then(result => {
                if (result !== undefined) {
                    consoleOutput.textContent += `[${timestamp()}] Result: ${result}\n`;
                }
                consoleOutput.textContent += `[${timestamp()}] Execution completed successfully\n`;
            })
            .catch(error => {
                consoleOutput.textContent += `[${timestamp()}] Execution Error: ${error.message}\n`;
            });

    } catch (error) {
        consoleOutput.textContent += `[${timestamp()}] Syntax Error: ${error.message}\n`;
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
