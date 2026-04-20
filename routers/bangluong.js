/**
 * ROUTER QUẢN LÝ BẢNG LƯƠNG
 * File này xử lý các route liên quan đến quản lý lương:
 * - Danh sách bảng lương (Admin xem toàn công ty, nhân viên xem lương riêng)
 * - Tạo phiếu lương mới
 * - Xác nhận thanh toán lương
 * - Gửi email bảng lương cho nhân viên
 * - Xóa phiếu lương
 * - Báo cáo lương
 */

const express = require('express');
const router = express.Router();
const BangLuong = require('../models/bangluong');
const PhongBan = require('../models/phongban');
const NhanVien = require('../models/nhanvien');
const { sendPayrollEmail } = require('../utils/gmail');
const { checkAdmin } = require('../middlewares/auth');

// Danh sách bảng lương
router.get('/', async (req, res) => {
    try {
        let query = {};
        // Nếu không phải Admin, chỉ cho xem lương của chính mình
        if (req.session.userRole !== 'Admin') {
            query.NhanVien = req.session.userId;
        }

        const bangluongs = await BangLuong.find(query).populate('NhanVien');
        const kyLuongs = req.session.userRole === 'Admin'
            ? [...new Set(bangluongs.map(item => item.KyLuong).filter(Boolean))]
            : [];

        res.render('bangluong/index', { 
            title: 'Bảng Lương HRHub', 
            bangluongs,
            kyLuongs,
            path: '/bangluong'
        });
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/');
    }
});

// GET Form thêm bảng lương
router.get('/them', checkAdmin, async (req, res) => {
    try {
        const nhanviens = await NhanVien.find({ TrangThai: 'Đang làm việc' });
        res.render('bangluong/them', {
            title: 'Tạo Phiếu Lương Mới',
            nhanviens,
            path: '/bangluong'
        });
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/bangluong');
    }
});

// POST Lưu bảng lương mới
router.post('/them', checkAdmin, async (req, res) => {
    try {
        const { NhanVien: nvId, KyLuong, LuongCoBan, Thuong, KhauTru, TrangThai } = req.body;
        
        // ThucLanh sẽ được tính tự động bởi pre-save hook trong model nếu có
        // Nếu không, ta tính tay ở đây cho chắc
        const ThucLanh = Number(LuongCoBan) + Number(Thuong) - Number(KhauTru);

        const bl = new BangLuong({
            NhanVien: nvId,
            KyLuong,
            LuongCoBan,
            Thuong,
            KhauTru,
            ThucLanh,
            TrangThai
        });

        await bl.save();
        req.session.success = 'Đã tạo phiếu lương thành công!';
        res.redirect('/bangluong');
    } catch (err) {
        req.session.error = 'Lỗi khi tạo phiếu lương: ' + err.message;
        res.redirect('/bangluong/them');
    }
});

// GET Xác nhận thanh toán
router.get('/thanh-toan/:id', checkAdmin, async (req, res) => {
    try {
        const bl = await BangLuong.findById(req.params.id);
        if (!bl) {
            req.session.error = 'Phiếu lương không tồn tại.';
            return res.redirect('/bangluong');
        }
        bl.TrangThai = 'Đã thanh toán';
        await bl.save();
        req.session.success = 'Đã xác nhận thanh toán thành công!';
        res.redirect('/bangluong');
    } catch (err) {
        req.session.error = 'Lỗi khi xác nhận thanh toán: ' + err.message;
        res.redirect('/bangluong');
    }
});

// GET Xóa bảng lương
router.get('/xoa/:id', checkAdmin, async (req, res) => {
    try {
        await BangLuong.findByIdAndDelete(req.params.id);
        req.session.success = 'Đã xóa phiếu lương thành công!';
        res.redirect('/bangluong');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/bangluong');
    }
});

// POST gửi thông báo lương qua Gmail API
router.post('/gui-email/:id', checkAdmin, async (req, res) => {
    try {
        const bangLuong = await BangLuong.findById(req.params.id).populate('NhanVien');
        if (!bangLuong || !bangLuong.NhanVien) {
            req.session.error = 'Không tìm thấy phiếu lương hoặc nhân viên tương ứng.';
            return res.redirect('/bangluong');
        }

        if (!bangLuong.NhanVien.Email) {
            req.session.error = 'Nhân viên chưa có email để nhận thông báo lương.';
            return res.redirect('/bangluong');
        }

        await sendPayrollEmail({
            toEmail: bangLuong.NhanVien.Email,
            employeeName: bangLuong.NhanVien.HoVaTen,
            payroll: bangLuong
        });

        req.session.success = 'Đã gửi email lương thành công!';
        res.redirect('/bangluong');
    } catch (err) {
        req.session.error = 'Lỗi khi gửi email lương: ' + err.message;
        res.redirect('/bangluong');
    }
});

router.post('/gui-email-hang-loat', checkAdmin, async (req, res) => {
    try {
        const kyLuong = (req.body.KyLuong || '').trim();
        if (!kyLuong) {
            req.session.error = 'Vui lòng chọn kỳ lương để gửi hàng loạt.';
            return res.redirect('/bangluong');
        }

        const bangLuongs = await BangLuong.find({ KyLuong: kyLuong }).populate('NhanVien');
        const validPayrolls = bangLuongs.filter(item => item.NhanVien && item.NhanVien.Email);

        if (!validPayrolls.length) {
            req.session.error = 'Không có phiếu lương nào hợp lệ để gửi email trong kỳ đã chọn.';
            return res.redirect('/bangluong');
        }

        let sentCount = 0;
        for (const bangLuong of validPayrolls) {
            await sendPayrollEmail({
                toEmail: bangLuong.NhanVien.Email,
                employeeName: bangLuong.NhanVien.HoVaTen,
                payroll: bangLuong
            });
            sentCount++;
        }

        req.session.success = `Đã gửi ${sentCount} email lương thành công!`;
        res.redirect('/bangluong');
    } catch (err) {
        req.session.error = 'Lỗi khi gửi email hàng loạt: ' + err.message;
        res.redirect('/bangluong');
    }
});

// Route báo cáo lương (Chỉ dành cho Admin)
router.get('/baocao', checkAdmin, async (req, res) => {
    try {
        // Lấy tất cả bảng lương, populate nhân viên và phòng ban của nhân viên đó
        const bangluongs = await BangLuong.find().populate({
            path: 'NhanVien',
            populate: { path: 'PhongBan' }
        });

        // Tính toán thống kê toàn công ty
        let tongLuongCoBan = 0;
        let tongThuong = 0;
        let tongKhauTru = 0;
        let tongThucLanh = 0;
        
        // Thống kê theo phòng ban
        const statsPhongBan = {};

        bangluongs.forEach(bl => {
            tongLuongCoBan += bl.LuongCoBan;
            tongThuong += bl.Thuong;
            tongKhauTru += bl.KhauTru;
            tongThucLanh += bl.ThucLanh;

            if (bl.NhanVien && bl.NhanVien.PhongBan) {
                const pbName = bl.NhanVien.PhongBan.TenPhongBan;
                if (!statsPhongBan[pbName]) {
                    statsPhongBan[pbName] = {
                        count: 0,
                        luongCoBan: 0,
                        thucLanh: 0
                    };
                }
                statsPhongBan[pbName].count++;
                statsPhongBan[pbName].luongCoBan += bl.LuongCoBan;
                statsPhongBan[pbName].thucLanh += bl.ThucLanh;
            }
        });

        res.render('bangluong/baocao', {
            title: 'Báo Cáo Lương Tổng Hợp',
            path: '/bangluong',
            stats: {
                company: {
                    totalRecords: bangluongs.length,
                    tongLuongCoBan,
                    tongThuong,
                    tongKhauTru,
                    tongThucLanh
                },
                phongban: statsPhongBan,
                details: bangluongs // Gửi chi tiết từng nhân viên
            }
        });
    } catch (err) {
        console.error(err);
        req.session.error = "Lỗi khi tạo báo cáo: " + err.message;
        res.redirect('/bangluong');
    }
});

module.exports = router;
