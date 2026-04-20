/**
 * ═══════════════════════════════════════════════════════════════════════════════════
 * HỆ THỐNG QUẢN LÝ NHÂN SỰ - HRHUB
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * File chính (Entry Point) của ứng dụng quản lý nhân sự (HR Management System)
 * 
 * Chức năng chính:
 * ✅ Quản lý nhân viên (thêm, sửa, xóa, xem chi tiết)
 * ✅ Quản lý phòng ban
 * ✅ Quản lý bảng lương (tạo, thanh toán, gửi email)
 * ✅ Quản lý chấm công (check-in/out, lịch sử, báo cáo)
 * ✅ Quản lý nghỉ phép (gửi đơn, duyệt, từ chối)
 * ✅ Xác thực người dùng (đăng nhập, đăng xuất)
 * 
 * Công nghệ:
 * - Backend: Express.js (Node.js)
 * - Database: MongoDB
 * - View Engine: EJS
 * - Session: express-session
 * 
 * Cấu trúc file:
 * /models - Các schema Mongoose
 * /routers - Các route/controller
 * /views - Template EJS
 * /public - Static files (CSS, JS, ảnh)
 * /utils - Utility functions
 * /middlewares - Custom middlewares
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

// ========== IMPORT DEPENDENCIES ==========
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config({ debug: false, quiet: true });

// ========== KHỞI TẠO EXPRESS APP ==========
const app = express();

// ========== CẤU HÌNH VIEW ENGINE ==========
// Sử dụng EJS làm template engine
app.use(expressLayouts);
app.set('layout', 'layout'); // Layout mặc định
app.set('views', path.join(__dirname, 'views')); // Thư mục views
app.set('view engine', 'ejs'); // Loại template

// ========== CẤU HÌNH MIDDLEWARES ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Static files

// Middleware session - lưu trữ thông tin người dùng đã đăng nhập
app.use(session({
    secret: 'SuperSecretKey_QuanLyNhanSu',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Hết hạn sau 1 ngày
}));

/**
 * Middleware xử lý thông báo (error/success) và truyền dữ liệu user
 * Các thông báo này sẽ hiển thị trên giao diện
 */
app.use((req, res, next) => {
    res.locals.message = '';
    const err = req.session.error;
    const msg = req.session.success;
    delete req.session.error; // Xóa sau khi lấy để không hiển thị lại
    delete req.session.success;

    // Render alert error nếu có lỗi
    if (err) res.locals.message = `<div class="alert error"><span class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></span><div>${err}</div><button class="alert-close" aria-label="Đóng">&times;</button></div>`;
    // Render alert success nếu có thành công
    if (msg) res.locals.message = `<div class="alert success"><span class="alert-icon"><i class="fa-solid fa-circle-check"></i></span><div>${msg}</div><button class="alert-close" aria-label="Đóng">&times;</button></div>`;

    // Truyền thông tin người dùng đã đăng nhập ra giao diện
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        name: req.session.userName,
        role: req.session.userRole,
        maNV: req.session.userMaNV
    } : null;

    next();
});

// ========== IMPORT ROUTERS ==========
const { router: authRouter, seedAdmin } = require('./routers/auth');
const indexRouter = require('./routers/index');
const nhanvienRouter = require('./routers/nhanvien');
const phongbanRouter = require('./routers/phongban');
const bangluongRouter = require('./routers/bangluong');
const chamcongRouter = require('./routers/chamcong');
const nghiphepRouter = require('./routers/nghiphep');

// ========== KẾT NỐI DATABASE ==========
const MONGODB_URI = 'mongodb://user1:user123@ac-9e23s1p-shard-00-02.ohaosp6.mongodb.net:27017/quanlynhansu?ssl=true&authSource=admin';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('>>>  Kết nối Database thành công rùi nhé!');
        seedAdmin(); // Khởi tạo admin ngay khi kết nối thành công
    })
    .catch(err => {
        console.error('!!! Lỗi kết nối Database rùi, thử lại nhé:', err.message);
    });

// ========== ROUTE CONFIGURATION ==========
// Route đăng nhập (công khai)
app.use('/', authRouter);

/**
 * Middleware yêu cầu đăng nhập đối với mọi route bên dưới
 * Nếu chưa đăng nhập sẽ redirect về trang login
 */
app.use((req, res, next) => {
    if (!req.session.userId) {
        const isApiRequest = req.originalUrl.startsWith('/api/') || req.originalUrl.includes('/api/');
        if (isApiRequest) {
            return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
        }

        req.session.error = 'Vui lòng đăng nhập để tiếp tục.';
        return res.redirect('/login');
    }
    next();
});

// Các route chính (yêu cầu đăng nhập)
app.use('/', indexRouter); // Trang chủ/dashboard
app.use('/nhanvien', nhanvienRouter); // Quản lý nhân viên
app.use('/phongban', phongbanRouter); // Quản lý phòng ban
app.use('/bangluong', bangluongRouter); // Quản lý bảng lương
app.use('/chamcong', chamcongRouter); // Quản lý chấm công
app.use('/nghiphep', nghiphepRouter); // Quản lý nghỉ phép

// ========== KHỞI ĐỘNG SERVER ==========
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`------>  Server đang chạy tại: http://localhost:${PORT}   <------`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} đã được dùng bởi process khác!`);
        console.log(`\n💡 Fix: Kill process cũ rồi chạy lại:`);
        console.log(`   Get-Process node | Stop-Process -Force`);
        console.log(`   npm t\n`);
        process.exit(1);
    }
});

// ========== GRACEFUL SHUTDOWN ==========
// Xử lý tắt server một cách an toàn
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        process.exit(0);
    });
});
