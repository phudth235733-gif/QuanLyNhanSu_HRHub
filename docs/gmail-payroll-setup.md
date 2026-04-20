# Gmail API Setup for Payroll Email

Ung dung nay gui thong bao luong qua Gmail API bang OAuth 2.0.

## Test nhanh khong can Google credential

Neu chi muon test giao dien va luong xu ly gui mail, bat:

```env
GOOGLE_GMAIL_MOCK_MODE=true
```

Khi do nut gui mail van chay thanh cong, nhung khong gui mail ra ngoai.
Noi dung mail se duoc ghi vao file:

`logs/mock-payroll-mails.log`

## 1. Bat Gmail API

Trong Google Cloud Console:

1. Tao hoac chon project.
2. Bat Gmail API.
3. Tao OAuth Client ID.
4. Chon loai ung dung phu hop. Theo tai lieu Google, web server app nen dung OAuth 2.0 va luu refresh token de dung lai.

Tai lieu chinh thuc:

- https://developers.google.com/workspace/gmail/api/quickstart/nodejs
- https://developers.google.com/gmail/api/guides/sending
- https://developers.google.com/identity/protocols/oauth2

## 2. Dien file .env

Sao chep `.env.example` thanh `.env`, sau do dien:

- `GOOGLE_GMAIL_CLIENT_ID`
- `GOOGLE_GMAIL_CLIENT_SECRET`
- `GOOGLE_GMAIL_REDIRECT_URI`
- `GOOGLE_GMAIL_SENDER_EMAIL`

Mac dinh co the dung:

`GOOGLE_GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground`

## 3. Lay authorization URL

Chay:

```powershell
npm run gmail:oauth
```

Script se in ra URL OAuth.

## 4. Dang nhap Google va lay code

1. Mo URL do trong trinh duyet.
2. Dang nhap tai khoan Gmail dung de gui mail.
3. Chap nhan quyen `gmail.send`.
4. Sau khi redirect, sao chep gia tri `code` trong URL.

## 5. Doi code lay refresh token

Trong PowerShell:

```powershell
$env:GOOGLE_GMAIL_AUTH_CODE="paste_authorization_code_here"
npm run gmail:oauth
```

Script se in ra:

```env
GOOGLE_GMAIL_REFRESH_TOKEN=...
```

Dan gia tri do vao file `.env`, sau do co the xoa `GOOGLE_GMAIL_AUTH_CODE`.

## 6. Gui mail luong

Vao trang Bang Luong, bam icon phong bi o dong phieu luong cua nhan vien.

Server se gui mail toi `NhanVien.Email`.

Neu dang mock mode, hay mo file `logs/mock-payroll-mails.log` de kiem tra noi dung mail da duoc tao.
