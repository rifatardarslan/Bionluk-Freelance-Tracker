import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import 'dotenv/config';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import TelegramBot from 'node-telegram-bot-api';

puppeteer.use(StealthPlugin());

// ==========================================
// 1. Environment & Configuration
// ==========================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SCAN_INTERVAL_MS = parseInt(process.env.SCAN_INTERVAL, 10) || 60000;

const BIONLUK_PHPSESSID = process.env.PHPSESSID || '';
const BIONLUK_SUPER_KEY = process.env.SUPER_KEY || '';
const BIONLUK_SUPER_TOKEN = process.env.SUPER_TOKEN || BIONLUK_PHPSESSID || ''; 
const BIONLUK_SUPER_VISITOR = process.env.SUPER_VISITOR || '';

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error(chalk.red('[CRITICAL] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing from .env. Exiting...'));
    process.exit(1);
}

if (!BIONLUK_PHPSESSID) {
    console.warn(chalk.yellow('[WARNING] PHPSESSID is missing from .env! Extracted data will likely fail.'));
}

// ==========================================
// 2. Database Initialization
// ==========================================
const db = new Database('database.db');
db.pragma('journal_mode = WAL');
db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_external_id TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

const insertProjectStmt = db.prepare('INSERT INTO projects (project_external_id) VALUES (?)');
const checkProjectStmt = db.prepare('SELECT id FROM projects WHERE project_external_id = ?');
const countProjectsStmt = db.prepare('SELECT COUNT(*) as count FROM projects');

function isProjectNew(uniqueId) {
    return !checkProjectStmt.get(uniqueId);
}

function saveProject(uniqueId) {
    insertProjectStmt.run(uniqueId);
}

// ==========================================
// 3. Telegram Bot Setup
// ==========================================
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

async function sendTelegramNotification(message, options = { parse_mode: 'Markdown' }) {
    try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, message, options);
    } catch (err) {
        console.error(chalk.red('[ERROR] Failed to send Telegram message:'), err.message);
    }
}

// Remote Status Check (/status)
bot.onText(/\/status/, (msg) => {
    if (msg.chat.id.toString() !== TELEGRAM_CHAT_ID.toString()) return;
    const { count } = countProjectsStmt.get();
    const uptime = Math.floor(process.uptime() / 60);
    sendTelegramNotification(
        `🟢 *Bionluk Bot Aktif*\n\n📊 *Kaydedilen İstekler:* ${count}\n⏱ *Çalışma Süresi:* ${uptime} dk\n🚀 *Durum:* Kesintisiz taranıyor.`
    );
});

let sessionExpiredNotified = false;

// ==========================================
// 4. Core Scraper Logic
// ==========================================
async function fetchBuyerRequests() {
    console.log(chalk.blue(`\n[INFO] Scan started at ${new Date().toLocaleTimeString()}`));
    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36');

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        if (BIONLUK_PHPSESSID) {
            await page.setCookie({
                name: 'PHPSESSID',
                value: BIONLUK_PHPSESSID.trim(),
                domain: '.bionluk.com',
                path: '/'
            });
        }

        // Establish session validity
        await page.goto('https://bionluk.com/panel/alici-istekleri', { waitUntil: 'domcontentloaded', timeout: 30000 });

        if (!page.url().includes('alici-istekleri')) {
            console.error(chalk.red(`[ERROR] Session expired. Redirected to: ${page.url()}`));
            if (!sessionExpiredNotified) {
                await sendTelegramNotification(`⚠️ *Kritik Uyarı:* Bionluk oturum süresi doldu veya anasayfaya yönlendirildi.\nLütfen \`.env\` dosyanızdaki *PHPSESSID* değerini güncelleyin.`);
                sessionExpiredNotified = true;
            }
            return; // Terminate early
        }

        const delay = Math.floor(Math.random() * (4000 - 2000 + 1) + 2000);
        await new Promise(r => setTimeout(r, delay));

        const tokens = {
            phpSessId: BIONLUK_PHPSESSID,
            superKey: BIONLUK_SUPER_KEY,
            superToken: BIONLUK_SUPER_TOKEN,
            superVisitor: BIONLUK_SUPER_VISITOR
        };

        const responseData = await page.evaluate(async (env) => {
            try {
                const headers = {
                    'Accept': 'application/json, text/plain, */*',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': 'https://bionluk.com',
                    'Referer': 'https://bionluk.com/panel/alici-istekleri',
                    'Cookie': `PHPSESSID=${env.phpSessId}`,
                    'super-key': env.superKey,
                    'super-token': env.superToken,
                    'super-visitor': env.superVisitor
                };

                const formData = new FormData();
                const res = await fetch('https://bionluk.com/api/request/list_all/', {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });

                const rawText = await res.text();
                let parsedJson = null;
                let isJson = false;

                try {
                    parsedJson = JSON.parse(rawText);
                    isJson = true;
                } catch (e) {
                    isJson = false;
                }

                return {
                    success: res.ok && isJson,
                    status: res.status,
                    data: parsedJson
                };
            } catch (err) {
                return { success: false, status: 500 };
            }
        }, tokens);

        if (!responseData.success) {
            console.error(chalk.red(`[ERROR] API request failed with status: ${responseData.status}`));
            if (responseData.status === 401 || responseData.status === 403) {
                if (!sessionExpiredNotified) {
                    await sendTelegramNotification(`⚠️ *Kritik Uyarı:* API isteği reddedildi (Status ${responseData.status}).\nLütfen oturum bilgilerinizi güncelleyin.`);
                    sessionExpiredNotified = true;
                }
            }
            return; // Terminate early
        }

        // On successful API response, reset the notification flag
        sessionExpiredNotified = false;

        const apiResult = responseData.data;
        let requestList = [];

        // Validate the extracted object
        if (apiResult && apiResult.data && Array.isArray(apiResult.data.requests)) {
            requestList = apiResult.data.requests;
            console.log(chalk.cyan(`[SUCCESS] Fetched ${requestList.length} requests successfully.`));
        } else {
            console.warn(chalk.yellow(`[WARN] Unexpected JSON format or empty arrays.`));
        }

        let notificationsSent = 0;

        for (const item of requestList) {
            const id = item.request_id || item.id || item._id;
            if (!id) continue;

            const uniqueId = id.toString();

            if (isProjectNew(uniqueId)) {
                saveProject(uniqueId);
                notificationsSent++;

                const description = item.description || item.detail || item.text || 'Açıklama belirtilmedi.';
                const cleanDesc = description.replace(/<[^>]*>?/gm, '').trim();
                let shortDesc = cleanDesc.substring(0, 150);
                if (cleanDesc.length > 150) shortDesc += '...';

                const budget = item.budget || item.price || item.amount || 'Belirtilmedi';

                const message = `🚀 *Yeni Alıcı İsteği!*\n\n` +
                                `📝 *Açıklama:* ${shortDesc}\n` +
                                `💰 *Bütçe:* ${budget}\n\n` +
                                `🔗 [İlana Git](https://bionluk.com/panel/alici-istekleri)`;

                await sendTelegramNotification(message);
                console.log(chalk.green(`[INFO] New request found and notified. ID: ${uniqueId}`));
            }
        }

        if (notificationsSent === 0) {
            console.log(chalk.gray('[INFO] Database synced. No new requests.'));
        }

    } catch (err) {
        console.error(chalk.red('[CRITICAL] Unexpected error during execution:'), err.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log(chalk.gray('[INFO] Browser closed. Terminating scan cycle.'));
        }
    }
}

// ==========================================
// 5. Application Entry Point
// ==========================================
console.log(chalk.green('==========================================='));
console.log(chalk.green('🚀 Bionluk Tracker Service Started'));
console.log(chalk.green('==========================================='));

fetchBuyerRequests();
setInterval(fetchBuyerRequests, SCAN_INTERVAL_MS);

sendTelegramNotification('🚀 *Sistem Başlatıldı!*\nBionluk istek tarayıcı başarılı bir şekilde aktif edildi.');