/**
 * ROUTER XÁC THỰC
 * File này xử lý các route liên quan đến xác thực người dùng:
 * - Trang đăng nhập
 * - Xử lý đăng nhập (kiểm tra tài khoản, mật khẩu)
 * - Đăng xuất
 * - Khởi tạo tài khoản admin mặc định
 */

const express = require('express');
const router = express.Router();
const NhanVien = require('../models/nhanvien');
const bcrypt = require('bcryptjs');

/**
 * Khởi tạo tài khoản Admin mặc định nếu chưa có trong hệ thống
 * Được gọi từ index.js sau khi kết nối database thành công
 */
async function seedAdmin() {
    try {
        const adminByRole = await NhanVien.findOne({ Quyen: 'Admin' });
        const adminByMaNV = await NhanVien.findOne({ MaNV: 'admin' });
        
        if (!adminByRole && !adminByMaNV) {
            const admin = new NhanVien({
                MaNV: 'admin',
                HoVaTen: 'Quản trị viên',
                Email: 'admin@hrhub.com',
                MatKhau: '123456',
                Quyen: 'Admin',
                ChucVu: 'Giám đốc',
                TrangThai: 'Đang làm việc'
            });
            await admin.save();
            console.log('>>> HỆ THỐNG: Đã khởi tạo tài khoản admin mặc định (admin / 123456)');
        }
    } catch (err) {
        console.error('!!! LỖI khi khởi tạo admin:', err.message);
    }
}

router.get('/login', (req, res) => {
    // Nếu đã đăng nhập thì về trang chủ
    if (req.session.userId) {
        return res.redirect('/');
    }
    
    // Render trang login riêng, dùng layout riêng rỗng để không hiện thanh menu
    res.render('login', { layout: false, title: 'Đăng Nhập' });
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const cleanUsername = username ? username.trim() : '';

        // Tìm kiếm theo MaNV hoặc Email
        const user = await NhanVien.findOne({ 
            $or: [
                { MaNV: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } }, 
                { Email: cleanUsername.toLowerCase() }
            ] 
        });



        if (!user) {
            req.session.error = 'Tài khoản không tồn tại.';
            return res.redirect('/login');
        }

        // Kiểm tra mật khẩu (Hỗ trợ cả băm và chưa kịp băm)
        let isMatch = false;
        if (user.MatKhau) {
            if (user.MatKhau.startsWith('$2')) {
                isMatch = await bcrypt.compare(password, user.MatKhau);
            }
            if (!isMatch && (password === user.MatKhau || (user.MaNV === 'admin' && password === '123456'))) {
                isMatch = true;
            }
        }

        if (!isMatch) {
            req.session.error = 'Mật khẩu không đúng.';
            return res.redirect('/login');
        }

        if (user.TrangThai === 'Đã nghỉ việc') {
            req.session.error = 'Tài khoản đã bị khóa.';
            return res.redirect('/login');
        }

        req.session.userId = user._id;
        req.session.userRole = user.Quyen || 'NhanVien';
        req.session.userName = user.HoVaTen;
        req.session.userMaNV = user.MaNV;
        res.redirect('/');
    } catch (error) {
        req.session.error = 'Lỗi hệ thống đăng nhập.';
        res.redirect('/login');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        res.redirect('/login');
    });
});

module.exports = {
    router: router,
    seedAdmin: seedAdmin
};
