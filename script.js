const DB_KEY = 'nexus_users';
const SESSION_KEY = 'nexus_session';
const TERMINAL_PASS = '56964'; // Globaler Override Bypass-Key für User-Rolle

let cmdHistory = [];
let historyIndex = -1;

// Virtuelles Dateisystem für V6.0 Explorer
const VIRTUAL_FILES = [
    { name: 'kernel_status.cfg', content: 'SYSTEM_STATE=OPERATIONAL\nFIREWALL=ACTIVE\nINTEGRITY=100%' },
    { name: 'manifesto.txt', content: 'NEXUS OPERATING SYSTEM v6.0\nBuilt combining Unix mechanics with fluid aesthetics.' },
    { name: 'network_nodes.log', content: 'Node 127.0.0.1: SECURE\nNode 192.168.23.102: BREACH_TARGET' },
    { name: 'restricted_intel.db', content: 'ADMINISTRATOR KEY CLEARANCE REQUIRED.\nBypasses are prohibited.' }
];

document.addEventListener('DOMContentLoaded', () => {
    initDB();
    checkSession();
    startClock();
    buildFilesGrid();
});

function initDB() {
    const existingData = localStorage.getItem(DB_KEY);
    if (!existingData || existingData === "null" || existingData === "undefined") {
        localStorage.setItem(DB_KEY, JSON.stringify([
            { user: 'admin', pass: '1234', token: 'NEX-ADM1', role: 'admin', isBanned: false, banData: null },
            { user: 'guest', pass: '1234', token: 'NEX-GST2', role: 'user', isBanned: false, banData: null },
            { user: 'Lennox', pass: 'Leonie-2009', token: 'LNF_2', role: 'admin', isBanned: false, banData: null }
        ]));
    }
}

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(DB_KEY)) || [];
    } catch (e) {
        initDB();
        return JSON.parse(localStorage.getItem(DB_KEY)) || [];
    }
}

function saveUsers(users) {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
}

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

function toggleAuth(mode) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    if (mode === 'login') {
        document.querySelector('.auth-tabs span:nth-child(1)').classList.add('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        document.querySelector('.auth-tabs span:nth-child(2)').classList.add('active');
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tokenInput = document.getElementById('access-token').value.trim();
    const users = getUsers();
    const user = users.find(acc => acc.token === tokenInput);

    if (user) {
        showLoader("Synchronizing Neural OS Engine...", () => {
            if (user.isBanned) {
                if (user.banData && user.banData.expires !== 'perm' && Date.now() > user.banData.expires) {
                    user.isBanned = false;
                    user.banData = null;
                    saveUsers(users);
                    startSession(user);
                } else {
                    let timeLeftText = "PERMANENT CRITICAL LOCK";
                    if (user.banData && user.banData.expires !== 'perm') {
                        let minsLeft = Math.ceil((user.banData.expires - Date.now()) / 60000);
                        timeLeftText = `RESTORATION IN: ${minsLeft} MIN`;
                    }
                    showBannedScreen(user.banData?.reason || "Security Directive Violation", timeLeftText);
                }
            } else {
                startSession(user);
            }
        });
    } else {
        showToast("CRITICAL: Access Token rejected.", "error");
    }
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value;
    const users = getUsers();

    if (users.find(acc => acc.user.toLowerCase() === u.toLowerCase())) {
        showToast("Identifier occupies space in mainframe.", "error");
        return;
    }

    let initial = u.charAt(0).toUpperCase();
    let numMatch = u.match(/\d/);
    let firstNum = numMatch ? numMatch[0] : (u.length % 10).toString();
    let pwPart = p.substring(0, 2);
    let codeBase = initial + firstNum + pwPart;

    const specials = ['$', '/', '-', '#', '!', '?', '@', '*'];
    while (codeBase.length < 8) {
        codeBase += specials[Math.floor(Math.random() * specials.length)];
    }

    users.push({ user: u, pass: p, token: codeBase, role: 'user', isBanned: false, banData: null });
    saveUsers(users);

    console.clear();
    console.log("%c========================================", "color: #ff0055; font-size: 20px; font-weight: bold;");
    console.log(`%c>>> TOKEN FOR ${u.toUpperCase()}: ${codeBase} <<<`, "color: #00f3ff; font-size: 25px; font-weight: bold;");
    console.log("%c========================================", "color: #ff0055; font-size: 22px; font-weight: bold;");

    downloadAccessCard(u, codeBase);
    document.getElementById('access-token').value = codeBase;
    toggleAuth('login');
    showToast("Identity allocated successfully.", "success");
});

function downloadAccessCard(username, token) {
    const fileContent = `========================================\n   NEXUS CORE ENVIRONMENT CARD         \n========================================\n\nIDENTITY:  ${username}\nALLOCATED: ${new Date().toLocaleString()}\n\n>>> SECURE ACCESS TOKEN: ${token} <<<\n========================================`;
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nexus_token_${username}.txt`;
    link.click();
}

function startSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    renderApp(user);
}

function showLoader(text, callback) {
    const loader = document.getElementById('loader');
    document.getElementById('loader-sub').innerText = text;
    document.getElementById('login-view').classList.add('hidden');
    loader.classList.remove('hidden');
    setTimeout(() => {
        loader.classList.add('hidden');
        callback();
    }, 1400);
}

function showBannedScreen(reason, durationText) {
    document.getElementById('banned-overlay').classList.remove('hidden');
    document.getElementById('ban-reason-text').innerText = reason;
    document.getElementById('ban-duration-text').innerText = durationText;
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
}

function checkSession() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (session) {
        document.getElementById('login-view').classList.add('hidden');
        renderApp(session);
    }
}

function renderApp(session) {
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('display-user').innerText = session.user.toUpperCase();
    document.getElementById('display-role').innerText = session.role.toUpperCase();

    const users = getUsers();
    updateStats(users);

    if (session.role === 'admin') {
        document.getElementById('admin-panel').classList.remove('hidden');
        renderTable(users);
    }
}

function switchTab(tab, title) {
    document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
    document.querySelectorAll('.dock-item').forEach(item => item.classList.remove('active'));

    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`current-window-title`).innerText = title.toUpperCase();

    const targetDock = { 'dash': 'dock-dash', 'network': 'dock-net', 'files': 'dock-files', 'terminal': 'dock-term', 'settings': 'dock-sett' }[tab];
    if (targetDock) document.getElementById(targetDock).classList.add('active');

    if (tab === 'terminal') checkTerminalAccess();
}

function checkTerminalAccess() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    document.getElementById('term-lock').classList.add('hidden');
    document.getElementById('term-interface').classList.add('hidden');
    document.getElementById('term-password').value = "";

    if (session.role === 'admin') {
        document.getElementById('term-interface').classList.remove('hidden');
        document.getElementById('term-prompt').innerText = `root@${session.user}:~$`;
        document.getElementById('cmd-input').focus();
    } else {
        document.getElementById('term-lock').classList.remove('hidden');
    }
}

function unlockTerminal() {
    const pass = document.getElementById('term-password').value;
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));

    if (pass === TERMINAL_PASS) {
        document.getElementById('term-lock').classList.add('hidden');
        document.getElementById('term-interface').classList.remove('hidden');
        document.getElementById('term-prompt').innerText = `user@${session.user}:~$`;
        printTerm("SANDBOX DEVIATION UNLOCKED. USER LEVEL ACCESS INITIALIZED.", "term-success");
        document.getElementById('cmd-input').focus();
    } else {
        showToast("MUTATION INVALID: Access Key Denied.", "error");
    }
}

// GUI-Toggles für das neue Settings-Tab
function toggleSetting(type) {
    if (type === 'blur') {
        const checked = document.getElementById('setting-blur').checked;
        document.body.style.setProperty('--glass', checked ? 'rgba(10, 22, 35, 0.45)' : 'rgba(5, 10, 15, 0.95)');
    } else if (type === 'matrix') {
        document.getElementById('term-interface').classList.toggle('matrix-mode');
    }
}

function purgeSystem() {
    if (confirm("Confirm extreme procedure? Immediate memory breakdown imminent.")) {
        localStorage.clear();
        location.reload();
    }
}

// --- AKTUALISIERTE FILE GRID FUNKTION ---
function buildFilesGrid() {
    const grid = document.getElementById('file-system-grid');

    // Neuer "Create File" Button als erstes Element
    grid.innerHTML = `
        <div class="file-icon add-file-btn" onclick="openFileModal()">
            <div class="icon-doc neon-blue" style="font-size: 2.2rem; line-height: 1.1;">+</div>
            <div class="file-name neon-blue" style="margin-top: 4px;">NEW_NODE</div>
        </div>
    `;

    // Bestehende Dateien laden
    VIRTUAL_FILES.forEach((f, idx) => {
        grid.innerHTML += `
            <div class="file-icon" onclick="openVirtualFile(${idx})">
                <div class="icon-doc">📄</div>
                <div class="file-name">${f.name}</div>
            </div>
        `;
    });
}

// --- NEUE FILE CREATION FUNKTIONEN ---
function openFileModal() {
    document.getElementById('new-file-name').value = '';
    document.getElementById('new-file-content').value = '';
    document.getElementById('file-create-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('new-file-name').focus(), 100);
}

function closeFileModal() {
    document.getElementById('file-create-overlay').classList.add('hidden');
}

function saveNewFile() {
    let name = document.getElementById('new-file-name').value.trim();
    const content = document.getElementById('new-file-content').value.trim();

    if (!name) {
        showToast("CRITICAL: Filename cannot be void.", "error");
        return;
    }

    // Automatisch .txt anhängen, falls nicht vorhanden
    if (!name.toLowerCase().endsWith('.txt')) {
        name += '.txt';
    }

    // Zur Array hinzufügen (temporär für diese Session)
    VIRTUAL_FILES.push({ name: name, content: content });

    // Grid neu laden und Modal schließen
    buildFilesGrid();
    closeFileModal();

    // Feedback im UI und Terminal
    showToast(`Document [${name}] compiled successfully.`, "success");
    if (document.getElementById('tab-terminal') && !document.getElementById('tab-terminal').classList.contains('hidden')) {
        printTerm(`New file injected: ${name}`, "term-success");
    }
}

function printTerm(text, cssClass = '') {
    const line = document.createElement('div');
    line.className = `term-line ${cssClass}`;
    line.innerHTML = text;
    termOutput.appendChild(line);
    termOutput.scrollTop = termOutput.scrollHeight;
}

function processCommand(input) {
    const parts = input.split(' ');
    const cmd = parts[0].toLowerCase();
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    let users = getUsers();

    switch (cmd) {
        case 'help':
            printTerm("--- STANDARD COMMANDS ---", "neon-blue");
            printTerm("sysinfo       : Display modern micro-kernel statistics");
            printTerm("whoami        : Verify active token clearance");
            printTerm("files         : Catalog all structural documents in sandbox");
            printTerm("read <file>   : Read virtual file directly in shell");
            printTerm("motd          : Extract daily communication message");
            printTerm("clear         : Cleanse memory display matrix");
            if (session.role === 'admin') {
                printTerm("--- HIGH CLEARANCE ADMINISTRATIVE MATRIX ---", "neon-pink");
                printTerm("list          : Display complete structure allocations");
                printTerm("delete <user> <reason> <override_key> : Wipes account entirely [V6.0]");
                printTerm("create <user> <pass>                  : Allocate fresh node");
                printTerm("setrole <user> <admin|user>           : Mutate node clearance");
                printTerm("ban <user> <time|perm> <reason>       : Restrict channel route");
                printTerm("unban <user>                          : Re-route restricted channel");
            }
            break;

        case 'clear':
            termOutput.innerHTML = '';
            break;

        case 'whoami':
            printTerm(`Active Entity: ${session.user.toUpperCase()}`);
            printTerm(`Clearance: ${session.role.toUpperCase()}`);
            printTerm(`Routing Token: ${session.token}`);
            break;

        case 'sysinfo':
            printTerm("NEXUS HYBRID CORE ENGINE v6.0 [Darwin/NT Fluid Blend]");
            printTerm("KERNEL: Microarchitecture-X86_64-V6");
            printTerm("DEVICES CONCURRENT: " + users.length);
            printTerm("UI COMPILER: Frosted Glassmorphism Engine (macOS Visual Protocol)", "term-success");
            break;

        case 'motd':
            printTerm("[MOTD]: System updated to 6.0. Flat layout depreciated. Glass interfaces integrated. Security amplified.", "neon-blue");
            break;

        case 'files':
            printTerm("Virtual Documents Sandbox Directory:", "neon-blue");
            VIRTUAL_FILES.forEach(f => printTerm(`-> ${f.name} (${f.content.length} bytes)`));
            break;

        case 'read':
            if (parts.length < 2) { printTerm("Target declaration required. Usage: read <filename>", "term-error"); return; }
            let foundFile = VIRTUAL_FILES.find(f => f.name.toLowerCase() === parts[1].toLowerCase());
            if (foundFile) {
                printTerm(`--- Start Stream [${foundFile.name}] ---`, "term-success");
                printTerm(foundFile.content.replace(/\n/g, '<br>'));
            } else {
                printTerm(`Error: Document '${parts[1]}' absent from space.`, "term-error");
            }
            break;

        // V6.0 ADMIN DELETE BEFEHL MIT OVERRIDE KEY
        case 'delete':
            if (session.role !== 'admin') { printTerm("AUTHORIZATION COLLAPSED: LEVEL 5 CLEARANCE DEFICIENT", "term-error"); return; }
            if (parts.length < 4) { printTerm("Syntax error. Format: delete {user} {Reason} {Override_Key}", "term-error"); return; }

            const targetDel = parts[1].trim();
            const delReason = parts[2];
            const overKey = parts[3];

            if (overKey !== TERMINAL_PASS) {
                printTerm("CRITICAL OPERATION REJECTED: Override key validation failure.", "term-error");
                return;
            }

            let delIndex = users.findIndex(u => u.user.toLowerCase() === targetDel.toLowerCase());
            if (delIndex !== -1) {
                if (users[delIndex].user.toLowerCase() === session.user.toLowerCase()) {
                    printTerm("Refused: Loop violation. Cannot eliminate host context.", "term-error");
                    return;
                }

                printTerm(`Executing extraction. Trace: ${delReason}`, "neon-pink");
                users.splice(delIndex, 1);
                saveUsers(users);

                printTerm(`[!] TARGET ACCOUNT '${targetDel.toUpperCase()}' COMPLETELY PURGED FROM LOCALSTORE DATABASE.`, "term-success");
                updateStats(users);
                renderTable(users);
            } else {
                printTerm("Extraction impossible: Entity target not structured.", "term-error");
            }
            break;

        case 'create':
            if (session.role !== 'admin') { printTerm("ACCESS DENIED", "term-error"); return; }
            if (parts.length < 3) { printTerm("Usage: create <username> <passphrase>", "term-error"); return; }

            const newUsername = parts[1].trim();
            const newPassword = parts[2];

            if (users.find(acc => acc.user.toLowerCase() === newUsername.toLowerCase())) {
                printTerm("Target space already claimed.", "term-error");
                return;
            }

            let initial = newUsername.charAt(0).toUpperCase();
            let generatedToken = initial + (newUsername.length % 10) + newPassword.substring(0, 2) + "$$$";
            users.push({ user: newUsername, pass: newPassword, token: generatedToken, role: 'user', isBanned: false, banData: null });
            saveUsers(users);

            printTerm(`[PROVISION SUCCESSFUL] Token allocated: ${generatedToken}`, "term-success");
            updateStats(users);
            renderTable(users);
            break;

        case 'setrole':
            if (session.role !== 'admin') { printTerm("ACCESS DENIED", "term-error"); return; }
            if (parts.length < 3) { printTerm("Usage: setrole <username> <admin|user>", "term-error"); return; }

            const targetName = parts[1].trim();
            const newRole = parts[2].toLowerCase();
            let targetUser = users.find(u => u.user.toLowerCase() === targetName.toLowerCase());

            if (targetUser) {
                targetUser.role = newRole === 'admin' ? 'admin' : 'user';
                saveUsers(users);
                printTerm(`Clearance changed for ${targetUser.user} -> ${newRole.toUpperCase()}`, "term-success");
                renderTable(users);
            } else {
                printTerm("Entity absent.", "term-error");
            }
            break;

        case 'list':
            if (session.role !== 'admin') { printTerm("ACCESS DENIED", "term-error"); return; }
            users.forEach(u => {
                let status = u.isBanned ? `<span class="term-error">CONTAINED</span>` : `<span class="term-success">LIVE</span>`;
                printTerm(`- ${u.user} [${u.role.toUpperCase()}] | TOKEN: ${u.token} | ${status}`);
            });
            break;

        case 'ban':
            if (session.role !== 'admin') { printTerm("ACCESS DENIED", "term-error"); return; }
            if (parts.length < 4) { printTerm("Usage: ban <user> <duration|perm> <reason>", "term-error"); return; }

            let tBan = users.find(u => u.user.toLowerCase() === parts[1].toLowerCase());
            if (tBan) {
                if (tBan.role === 'admin') { printTerm("Refused: Cannot route containment to administrator.", "term-error"); return; }
                tBan.isBanned = true;
                let exp = parts[2] === 'perm' ? 'perm' : Date.now() + (parseInt(parts[2]) * 60000);
                tBan.banData = { reason: parts.slice(3).join(" "), expires: exp };
                saveUsers(users);
                printTerm(`Channel restricted for: ${parts[1]}`, "term-error");
                updateStats(users);
                renderTable(users);
            }
            break;

        case 'unban':
            if (session.role !== 'admin') { printTerm("ACCESS DENIED", "term-error"); return; }
            let tUnban = users.find(u => u.user.toLowerCase() === parts[1].toLowerCase());
            if (tUnban) {
                tUnban.isBanned = false;
                tUnban.banData = null;
                saveUsers(users);
                printTerm(`Channel restored: ${parts[1]}`, "term-success");
                updateStats(users);
                renderTable(users);
            }
            break;

        default:
            printTerm(`Instruction anomaly '${cmd}' unregistered. Invoke 'help' file.`, "term-error");
    }
}

function updateStats(users) {
    document.getElementById('stat-users').innerText = users.filter(u => !u.isBanned).length;
    document.getElementById('stat-banned').innerText = users.filter(u => u.isBanned).length;
}

function renderTable(users) {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '';
    users.forEach(u => {
        let expireText = "-";
        if (u.isBanned && u.banData) {
            expireText = u.banData.expires === 'perm' ? "PERM" : Math.ceil((u.banData.expires - Date.now()) / 60000) + "m";
        }
        tbody.innerHTML += `
            <tr style="${u.isBanned ? 'color:var(--neon-pink);opacity:0.6;' : ''}">
                <td>${u.user}</td>
                <td><span class="badge-${u.role}">${u.role.toUpperCase()}</span></td>
                <td style="color: var(--neon-blue); font-family: var(--font-mono);">${u.token}</td>
                <td>${u.isBanned ? 'CONTAINED' : 'LIVE'}</td>
                <td>${expireText}</td>
            </tr>`;
    });
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString();
        document.getElementById('net-load').innerText = "NET_LOAD: " + (Math.random() * (0.09 - 0.01) + 0.01).toFixed(3) + "%";
    }, 1000);
}

function showToast(text, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerText = text;
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 400);
    }, 3500);
}

// --- V6.0 DYNAMIC CYBER CURSOR ENGINE (BUGFIX) ---
const cursorDot = document.getElementById('cyber-cursor-dot');
const cursorRing = document.getElementById('cyber-cursor-ring');

// Nur starten, wenn die Elemente im HTML auch wirklich da sind!
if (cursorDot && cursorRing) {
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    function animateRing() {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;

        cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animateRing);
    }
    animateRing();

    document.addEventListener('mouseover', (e) => {
        const interactive = e.target.closest('button, input, textarea, .dock-item, .file-icon, .mac-dots .dot, .auth-tab, li');
        if (interactive) {
            cursorDot.classList.add('hover');
            cursorRing.classList.add('hover');
        }
    });

    document.addEventListener('mouseout', (e) => {
        const interactive = e.target.closest('button, input, textarea, .dock-item, .file-icon, .mac-dots .dot, .auth-tab, li');
        if (interactive) {
            cursorDot.classList.remove('hover');
            cursorRing.classList.remove('hover');
        }
    });
}