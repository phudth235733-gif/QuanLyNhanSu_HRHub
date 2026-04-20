require('dotenv').config();
const { google } = require('googleapis');

const REQUIRED_ENV_VARS = [
    'GOOGLE_GMAIL_CLIENT_ID',
    'GOOGLE_GMAIL_CLIENT_SECRET',
    'GOOGLE_GMAIL_REDIRECT_URI'
];

function ensureConfig() {
    const missing = REQUIRED_ENV_VARS.filter(name => !process.env[name]);
    if (missing.length > 0) {
        throw new Error(`Thiếu cấu hình: ${missing.join(', ')}`);
    }
}

function createOAuthClient() {
    ensureConfig();

    return new google.auth.OAuth2(
        process.env.GOOGLE_GMAIL_CLIENT_ID,
        process.env.GOOGLE_GMAIL_CLIENT_SECRET,
        process.env.GOOGLE_GMAIL_REDIRECT_URI
    );
}

function printInstructions(url) {
    console.log('1. Mở URL bên dưới trong trình duyệt và đăng nhập Google:');
    console.log(url);
    console.log('');
    console.log('2. Sau khi Google redirect, sao chép tham số code từ URL trả về.');
    console.log('3. Chạy lại lệnh với biến môi trường GOOGLE_GMAIL_AUTH_CODE để đổi code lấy refresh token.');
    console.log('');
    console.log('Ví dụ PowerShell:');
    console.log('$env:GOOGLE_GMAIL_AUTH_CODE="ma-code"; node .\\scripts\\google-gmail-oauth.js');
}

async function main() {
    const oauth2Client = createOAuthClient();
    const authCode = process.env.GOOGLE_GMAIL_AUTH_CODE;

    if (!authCode) {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/gmail.send']
        });

        printInstructions(authUrl);
        return;
    }

    const { tokens } = await oauth2Client.getToken(authCode);

    console.log('Lay token thanh cong.');
    console.log('');
    console.log('Cap nhat file .env voi cac gia tri sau:');
    console.log(`GOOGLE_GMAIL_REFRESH_TOKEN=${tokens.refresh_token || ''}`);
    if (tokens.expiry_date) {
        console.log(`GOOGLE_GMAIL_ACCESS_TOKEN_EXPIRES_AT=${tokens.expiry_date}`);
    }
    console.log('');
    console.log('Luu y: refresh token chi tra ve o lan cap quyen co prompt consent.');
}

main().catch(error => {
    console.error('Loi OAuth Gmail:', error.message);
    process.exit(1);
});
