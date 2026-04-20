/**
 * UTILITY GMAIL
 * File này chứa các hàm để gửi email thông qua Gmail API
 * Được sử dụng để gửi bảng lương cho nhân viên
 */

const { google } = require('googleapis');

function getGmailClient() {
    const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI;
    const refreshToken = process.env.GOOGLE_GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
        throw new Error('Thiếu cấu hình Gmail API. Cần GOOGLE_GMAIL_CLIENT_ID, GOOGLE_GMAIL_CLIENT_SECRET, GOOGLE_GMAIL_REDIRECT_URI, GOOGLE_GMAIL_REFRESH_TOKEN.');
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({ refresh_token: refreshToken });

    return google.gmail({ version: 'v1', auth });
}

function toBase64Url(content) {
    return Buffer.from(content)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function buildPayrollEmail({ fromEmail, toEmail, employeeName, payroll }) {
    const subject = `Thong bao luong ${payroll.KyLuong} - HRHub`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
            <h2 style="color: #4f46e5;">Thong bao bang luong</h2>
            <p>Xin chao ${employeeName},</p>
            <p>HRHub gui ban thong tin bang luong <strong>${payroll.KyLuong}</strong>.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 520px; margin: 16px 0;">
                <tr>
                    <td style="border: 1px solid #d1d5db; padding: 10px;">Luong co ban</td>
                    <td style="border: 1px solid #d1d5db; padding: 10px;"><strong>${payroll.LuongCoBan.toLocaleString('vi-VN')} VND</strong></td>
                </tr>
                <tr>
                    <td style="border: 1px solid #d1d5db; padding: 10px;">Thuong</td>
                    <td style="border: 1px solid #d1d5db; padding: 10px;">${payroll.Thuong.toLocaleString('vi-VN')} VND</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #d1d5db; padding: 10px;">Khau tru</td>
                    <td style="border: 1px solid #d1d5db; padding: 10px;">${payroll.KhauTru.toLocaleString('vi-VN')} VND</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #d1d5db; padding: 10px;">Thuc lanh</td>
                    <td style="border: 1px solid #d1d5db; padding: 10px; color: #059669;"><strong>${payroll.ThucLanh.toLocaleString('vi-VN')} VND</strong></td>
                </tr>
                <tr>
                    <td style="border: 1px solid #d1d5db; padding: 10px;">Trang thai</td>
                    <td style="border: 1px solid #d1d5db; padding: 10px;">${payroll.TrangThai}</td>
                </tr>
            </table>
            <p>Neu can trao doi them, vui long lien he phong Nhan su.</p>
            <p>HRHub</p>
        </div>
    `;

    const mime = [
        `From: HRHub <${fromEmail}>`,
        `To: ${toEmail}`,
        'Content-Type: text/html; charset="UTF-8"',
        'MIME-Version: 1.0',
        `Subject: ${subject}`,
        '',
        html
    ].join('\r\n');

    return toBase64Url(mime);
}

async function sendPayrollEmail({ toEmail, employeeName, payroll }) {
    const senderEmail = process.env.GOOGLE_GMAIL_SENDER_EMAIL;
    if (!senderEmail) {
        throw new Error('Thiếu cấu hình GOOGLE_GMAIL_SENDER_EMAIL.');
    }

    try {
        console.log(`📧 Đang gửi email cho: ${employeeName} (${toEmail})`);
        console.log(`   Kỳ lương: ${payroll.KyLuong}`);
        
        const gmail = getGmailClient();
        const raw = buildPayrollEmail({
            fromEmail: senderEmail,
            toEmail,
            employeeName,
            payroll
        });

        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw }
        });

        console.log(`✓ Email gửi thành công! Message ID: ${result.data.id}`);
        return result;
    } catch (error) {
        console.error(`✗ Lỗi gửi email lương cho ${employeeName} (${toEmail}):`, error.message);
        
        if (error.message.includes('invalid_grant')) {
            throw new Error('Refresh token đã hết hạn. Vui lòng chạy lại: node ./scripts/google-gmail-oauth.js');
        }
        
        if (error.message.includes('Email address not found')) {
            throw new Error(`Email address không hợp lệ: ${toEmail}`);
        }
        
        throw error;
    }
}

module.exports = {
    sendPayrollEmail
};
