// Nutzt ein lokal installiertes Chrome, falls vorhanden; sonst lädt Puppeteer seinen eigenen Browser.
const fs = require('fs');
const candidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
];
const executablePath = candidates.find((p) => fs.existsSync(p));
module.exports = executablePath ? { executablePath, skipDownload: true } : {};
