const DB_KEY = 'nexus_users';
const SESSION_KEY = 'nexus_session';
const TERMINAL_PASS = '56964'; // Override Key für Terminal (User-Rolle)

// Terminal History Speicher
let cmdHistory = [];
let historyIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    initDB();
    checkSession();
    startClock();
});

// --- DATABASE ---
function initDB() {
    const existingData = localStorage.getItem(DB_KEY);
    if (!existingData || existingData === "null" || existingData === "undefined") {
        localStorage.setItem(DB_KEY, JSON.stringify([
            // Standard-Accounts haben vordefinierte Token für den Erst-Login bekommen!
            { user: 'admin', pass: '1234', token: 'NEX-ADM1', role: 'admin', isBanned: false, banData: null },
        ]));
    }
}

function getUsers() {
    try {
        const data = localStorage.getItem(DB_KEY);
        return JSON.parse(data) || [];
    } catch (e) {
        initDB();
        return JSON.parse(localStorage.getItem(DB_KEY)) || [];
    }
}

function saveUsers(users) {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
}

// --- AUTH, LOGIN & REGISTRATION ---
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

// LOGIN LOGIC ÜBER DEN ACCESS-TOKEN
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tokenInput = document.getElementById('access-token').value.trim();
    const users = getUsers();

    // Suchen nach dem User mit diesem Token
    const user = users.find(acc => acc.token === tokenInput);

    if (user) {
        showLoader("Decrypting Access Token...", () => {
            // Bann-Check inkl. Zeitablauf
            if (user.isBanned) {
                if (user.banData && user.banData.expires !== 'perm' && Date.now() > user.banData.expires) {
                    user.isBanned = false;
                    user.banData = null;
                    saveUsers(users);
                    startSession(user);
                } else {
                    let timeLeftText = "PERMANENT";
                    if (user.banData && user.banData.expires !== 'perm') {
                        let minsLeft = Math.ceil((user.banData.expires - Date.now()) / 60000);
                        timeLeftText = `EXPIRES IN: ${minsLeft} MINUTEN`;
                    }
                    showBannedScreen(user.banData?.reason || "Protocol Violation", timeLeftText);
                }
            } else {
                startSession(user);
            }
        });
    } else {
        alert("ACCESS DENIED: Invalid or revoked Access Token.");
    }
});

// REGISTRATION LOGIC WITH TOKEN GENERATION & TXT DOWNLOAD
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value;

    const users = getUsers();
    if (users.find(acc => acc.user.toLowerCase() === u.toLowerCase())) {
        alert("ERROR: Identity already registered in the mainframe.");
        return;
    }

    // Token Generierung
    let initial = u.charAt(0).toUpperCase();
    let numMatch = u.match(/\d/);
    let firstNum = numMatch ? numMatch[0] : (u.length % 10).toString();
    let pwPart = p.substring(0, 2);
    let codeBase = initial + firstNum + pwPart;

    const specials = ['$', '/', '-', '#', '!', '?', '@', '*'];
    while (codeBase.length < 8) {
        codeBase += specials[Math.floor(Math.random() * specials.length)];
    }

    // Neuen User in die "Datenbank" pushen
    users.push({ user: u, pass: p, token: codeBase, role: 'user', isBanned: false, banData: null });
    saveUsers(users);

    // F12 Logausgabe
    console.clear();
    console.log("%c========================================", "color: #ff0055; font-size: 20px; font-weight: bold; background: #000;");
    console.log("%c⚠️ NEXUS SECURE TRANSMISSION INTERCEPTED ⚠️", "color: #00f3ff; font-size: 24px; font-weight: bold; background: #000;");
    console.log(`%c[REGISTRATION COMPLETE] IDENTITY: ${u}`, "color: #00ff9d; font-size: 16px; background: #000;");
    console.log(`%c>>> YOUR LOGIN ACCESS TOKEN: ${codeBase} <<<`, "color: #ff0055; font-size: 22px; font-weight: bold; background: #000;");
    console.log("%c========================================", "color: #ff0055; font-size: 20px; font-weight: bold; background: #000;");

    alert(`IDENTITY CREATED!\n\nDein Login-Token lautet: ${codeBase}\n\nEr wurde in der F12-Konsole hinterlegt. Klicke auf OK, um deine digitale 'Access Card' als Textdatei herunterzuladen!`);

    // FEATURE 1: Automatischer Download der Login-Daten als Textdatei
    downloadAccessCard(u, codeBase);

    document.getElementById('access-token').value = codeBase; // Fügt den Token direkt im Login-Feld ein
    toggleAuth('login');
});

function downloadAccessCard(username, token) {
    const fileContent = `========================================\n   NEXUS NETWORKS // ACCESS CARD       \n========================================\n\nIDENTITY:  ${username}\nCREATION:  ${new Date().toLocaleString()}\nCLEARANCE: USER_NODE\n\n>>> YOUR ACCESS TOKEN: ${token} <<<\n\nHinweis: Bewahre diesen Token gut auf. Er wird \nausschlieﬂlich für das Login-Verfahren benötigt.\n========================================`;
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nexus_access_${username}.txt`;
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
    }, 1800);
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

// --- APP NAVIGATION ---
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

function switchTab(tab) {
    document.getElementById('tab-dash').classList.add('hidden');
    document.getElementById('tab-network').classList.add('hidden');
    document.getElementById('tab-terminal').classList.add('hidden');
    document.getElementById('btn-dash').classList.remove('active');
    document.getElementById('btn-net').classList.remove('active');
    document.getElementById('btn-term').classList.remove('active');

    if (tab === 'dash') {
        document.getElementById('tab-dash').classList.remove('hidden');
        document.getElementById('btn-dash').classList.add('active');
    } else if (tab === 'network') {
        document.getElementById('tab-network').classList.remove('hidden');
        document.getElementById('btn-net').classList.add('active');
    } else if (tab === 'terminal') {
        document.getElementById('tab-terminal').classList.remove('hidden');
        document.getElementById('btn-term').classList.add('active');
        checkTerminalAccess();
    }
}

// --- TERMINAL LOGIC ---
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
        printTerm("ACCESS GRANTED. LEVEL 2 INTERFACE LOADED.", "term-success");
        document.getElementById('cmd-input').focus();
    } else {
        alert("WRONG OVERRIDE KEY");
    }
}

// Terminal Command Input Handler & History Feature
const cmdInput = document.getElementById('cmd-input');
const termOutput = document.getElementById('term-output');

cmdInput.addEventListener('keydown', (e) => {
    // FEATURE 2: Command History (Pfeiltasten hoch/runter)
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (cmdHistory.length > 0 && historyIndex < cmdHistory.length - 1) {
            historyIndex++;
            cmdInput.value = cmdHistory[cmdHistory.length - 1 - historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            cmdInput.value = cmdHistory[cmdHistory.length - 1 - historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            cmdInput.value = '';
        }
    } else if (e.key === 'Enter') {
        const input = cmdInput.value.trim();
        const promptText = document.getElementById('term-prompt').innerText;
        printTerm(`${promptText} ${input}`);

        if (input !== "") {
            cmdHistory.push(input);
            historyIndex = -1;
            processCommand(input);
        }
        cmdInput.value = '';
    }
});

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
            printTerm("--- NEXUS KERNEL COMMANDS ---", "neon-blue");
            printTerm("sysinfo       : Display mainframe specifications");
            printTerm("whoami        : Display current session identity");
            printTerm("ping <ip>     : Send ICMP packets to target node");
            printTerm("matrix        : Toggle visual override");
            printTerm("hack          : Start network breach routine [NEW]");
            printTerm("clear         : Wipe terminal display");
            if (session.role === 'admin') {
                printTerm("--- ADMIN COMMANDS ---", "neon-pink");
                printTerm("list          : List all registered identities & tokens");
                printTerm("createaccount : Syntax -> createaccount <user> <passphrase>");
                printTerm("setrole       : Syntax -> setrole <user> <admin|user>");
                printTerm("ban           : Syntax -> ban <user> <time|perm> <reason>");
                printTerm("unban         : Syntax -> unban <user>");
            }
            break;

        case 'clear':
            termOutput.innerHTML = '';
            break;

        case 'whoami':
            printTerm(`Identity: ${session.user.toUpperCase()}`);
            printTerm(`Clearance: ${session.role.toUpperCase()}`);
            printTerm(`Active Token: ${session.token}`);
            break;

        case 'sysinfo':
            printTerm("NEXUS_OS v5.5 // KERNEL 8.5.2-M-AMD64");
            printTerm("CPU: Quantum Core QX-99 @ 14.2 GHz");
            printTerm("RAM: 2048 TB YottaRAM");
            printTerm("SECURITY PROTOCOL: Token-Enforced Grid Gate", "term-success");
            break;

        // FEATURE: Terminal Account Creation (NUR FÜR ADMINS)
        case 'createaccount':
        case 'create':
            if (session.role !== 'admin') {
                printTerm("ACCESS DENIED: LEVEL 5 CLEARANCE REQUIRED", "term-error");
                return;
            }

            if (parts.length < 3) {
                printTerm("Syntax error. Use: createaccount <username> <passphrase>", "term-error");
                return;
            }

            const newUsername = parts[1].trim();
            const newPassword = parts[2];

            if (users.find(acc => acc.user.toLowerCase() === newUsername.toLowerCase())) {
                printTerm(`Error: Identity '${newUsername}' already registered in mainframe.`, "term-error");
                return;
            }

            let initial = newUsername.charAt(0).toUpperCase();
            let numMatch = newUsername.match(/\d/);
            let firstNum = numMatch ? numMatch[0] : (newUsername.length % 10).toString();
            let pwPart = newPassword.substring(0, 2);
            let generatedToken = initial + firstNum + pwPart;

            const specials = ['$', '/', '-', '#', '!', '?', '@', '*'];
            while (generatedToken.length < 8) {
                generatedToken += specials[Math.floor(Math.random() * specials.length)];
            }

            users.push({
                user: newUsername,
                pass: newPassword,
                token: generatedToken,
                role: 'user',
                isBanned: false,
                banData: null
            });
            saveUsers(users);

            printTerm(`[CREATION SUCCESSFUL]`, "term-success");
            printTerm(`IDENTITY: ${newUsername}`);
            printTerm(`ACCESS TOKEN REVEALED: <span style="color:var(--neon-blue); font-weight:bold; letter-spacing:1px;">${generatedToken}</span>`);

            updateStats(users);
            renderTable(users);
            break;

        // FEATURE: Rechte vergeben oder entziehen (NUR FÜR ADMINS)
        case 'setrole':
            if (session.role !== 'admin') {
                printTerm("ACCESS DENIED: LEVEL 5 CLEARANCE REQUIRED", "term-error");
                return;
            }

            if (parts.length < 3) {
                printTerm("Syntax error. Use: setrole <username> <admin|user>", "term-error");
                return;
            }

            const targetName = parts[1].trim();
            const newRole = parts[2].toLowerCase();

            if (newRole !== 'admin' && newRole !== 'user') {
                printTerm("Error: Invalid role. Use 'admin' or 'user'.", "term-error");
                return;
            }

            let targetUser = users.find(u => u.user.toLowerCase() === targetName.toLowerCase());

            if (targetUser) {
                if (targetUser.user.toLowerCase() === session.user.toLowerCase()) {
                    printTerm("Error: You cannot change your own clearance level.", "term-error");
                    return;
                }

                targetUser.role = newRole;
                saveUsers(users);

                printTerm(`[CLEARANCE UPDATED]`, "term-success");
                printTerm(`Identity '${targetUser.user}' is now assigned to role: <span style="color:var(--neon-pink); font-weight:bold;">${newRole.toUpperCase()}</span>`);

                renderTable(users);
            } else {
                printTerm(`Error: Identity '${targetName}' not found in mainframe.`, "term-error");
            }
            break;

        case 'hack':
            printTerm("INITIALIZING BRUTE FORCE LINK...", "neon-pink");
            cmdInput.disabled = true;
            let count = 0;
            let interval = setInterval(() => {
                let randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
                printTerm(`[TRYING NODE KEY]: 0x${randomHex} -> RETRYING...`, "term-error");
                count++;
                if (count >= 10) {
                    clearInterval(interval);
                    printTerm("[✓] SUCCESS! EXPLOIT INJECTED INTO IP 192.168.23.102", "term-success");
                    cmdInput.disabled = false;
                    cmdInput.focus();
                }
            }, 250);
            break;

        case 'ping':
            if (parts.length < 2) { printTerm("Error: Specify target IP.", "term-error"); return; }
            printTerm(`Pinging ${parts[1]} with 32 bytes of data...`);
            setTimeout(() => printTerm(`Reply from ${parts[1]}: bytes=32 time=12ms TTL=112`, "term-success"), 300);
            break;

        case 'matrix':
            document.getElementById('term-interface').classList.toggle('matrix-mode');
            printTerm("Visual override engaged.");
            break;

        case 'list':
            if (session.role !== 'admin') { printTerm("ACCESS DENIED", "term-error"); return; }
            users.forEach(u => {
                let status = u.isBanned ? `<span class="term-error">BANNED</span>` : `<span class="term-success">ACTIVE</span>`;
                printTerm(`- ${u.user} [${u.role}] | TOKEN: ${u.token} -> ${status}`);
            });
            break;

        case 'ban':
            if (session.role !== 'admin') { printTerm("ACCESS DENIED: LEVEL 5 CLEARANCE REQUIRED", "term-error"); return; }
            if (parts.length < 4) { printTerm("Syntax error. Use: ban <user> <duration|perm> <reason...>", "term-error"); return; }

            const targetBanUser = parts[1];
            const duration = parts[2];
            const reason = parts.slice(3).join(" ");

            let tBan = users.find(u => u.user.toLowerCase() === targetBanUser.toLowerCase());
            if (tBan) {
                if (tBan.role === 'admin') { printTerm("Error: Cannot ban another administrator.", "term-error"); return; }

                tBan.isBanned = true;
                let expiresAt = 'perm';

                if (duration !== 'perm') {
                    const mins = parseInt(duration);
                    if (isNaN(mins)) { printTerm("Error: Duration must be 'perm' or a number.", "term-error"); return; }
                    expiresAt = Date.now() + (mins * 60000);
                }

                tBan.banData = { reason: reason, expires: expiresAt, bannedAt: Date.now() };
                saveUsers(users);

                printTerm(`[!] TARGET '${targetBanUser}' LOCKED OUT.`, "term-error");
                updateStats(users);
                renderTable(users);
            } else {
                printTerm("Error: Identity not found.", "term-error");
            }
            break;

        case 'unban':
            if (session.role !== 'admin') { printTerm("ACCESS DENIED", "term-error"); return; }
            if (parts.length < 2) { printTerm("Syntax error. Use: unban <user>", "term-error"); return; }

            let tUnban = users.find(u => u.user.toLowerCase() === parts[1].toLowerCase());
            if (tUnban) {
                tUnban.isBanned = false;
                tUnban.banData = null;
                saveUsers(users);
                printTerm(`Target '${parts[1]}' has been restored to the grid.`, "term-success");
                updateStats(users);
                renderTable(users);
            } else {
                printTerm("Error: Target not found.", "term-error");
            }
            break;

        default:
            printTerm(`Kernel panic: Command '${cmd}' unrecognized. Type 'help'.`, "term-error");
    }
}

// Helper to update UI
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
            if (u.banData.expires === 'perm') expireText = "PERM";
            else {
                let mins = Math.ceil((u.banData.expires - Date.now()) / 60000);
                expireText = mins > 0 ? `${mins}m left` : 'EXPIRED';
            }
        }

        tbody.innerHTML += `
            <tr style="${u.isBanned ? 'color:var(--neon-pink);' : ''}">
                <td>${u.user}</td>
                <td>${u.role}</td>
                <td style="color: var(--neon-blue); font-weight: bold;">${u.token}</td>
                <td>${u.isBanned ? `[QUARANTINED]<br><span style="font-size:0.7rem">${u.banData.reason}</span>` : 'ACTIVE'}</td>
                <td>${expireText}</td>
            </tr>`;
    });
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText =
            now.toLocaleTimeString() + ":" + now.getMilliseconds().toString().padStart(3, '0');
    }, 47);
}
