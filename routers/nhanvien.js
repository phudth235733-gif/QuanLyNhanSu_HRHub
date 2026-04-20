/**
 * ROUTER QUẢN LÝ NHÂN VIÊN
 * File này xử lý các route liên quan đến quản lý nhân viên:
 * - Danh sách nhân viên
 * - Xem chi tiết hồ sơ nhân viên
 * - Thêm nhân viên mới
 * - Cập nhật thông tin nhân viên
 * - Xóa nhân viên
 */

const express = require('express');
const router = express.Router();
const NhanVien = require('../models/nhanvien');
const PhongBan = require('../models/phongban');
const { checkAdmin } = require('../middlewares/auth');

// GET Danh sách nhân viên
router.get('/', checkAdmin, async (req, res) => {
    try {
        let filter = {
            TrangThai: { $in: ['Đang làm việc', 'Nghỉ phép'] }
        };
        
        if (req.query.q) {
            filter.$and = [
                { TrangThai: { $in: ['Đang làm việc', 'Nghỉ phép'] } },
                { $or: [
                    { HoVaTen: { $regex: req.query.q, $options: 'i' } },
                    { MaNV: { $regex: req.query.q, $options: 'i' } }
                ]}
            ];
            delete filter.TrangThai; // Chuyển vào $and
        }

        const nhanviens = await NhanVien.find(filter).populate('PhongBan');
        res.render('nhanvien/index', { 
            title: 'Quản Lý Nhân Viên', 
            nhanviens,
            path: '/nhanvien',
            keyword: req.query.q || ''
        });
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/');
    }
});

// GET Chi tiết nhân viên (Hồ sơ)
router.get('/chitiet/:id', async (req, res) => {
    try {
        const nhanvien = await NhanVien.findById(req.params.id).populate('PhongBan');
        if (!nhanvien) {
            req.session.error = 'Không tìm thấy thông tin nhân viên!';
            return res.redirect('/nhanvien');
        }
        res.render('nhanvien/chitiet', {
            title: 'Hồ Sơ Nhân Viên',
            nhanvien,
            path: '/nhanvien'
        });
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/nhanvien');
    }
});

// GET Form thêm nhân viên
router.get('/them', checkAdmin, async (req, res) => {
    try {
        const phongbans = await PhongBan.find();
        res.render('nhanvien/them', { 
            title: 'Thêm Nhân Viên Mới',
            phongbans,
            path: '/nhanvien/them'
        });
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/nhanvien');
    }
});

// POST Lưu nhân viên mới
router.post('/them', checkAdmin, async (req, res) => {
    try {
        const nvData = req.body;
        
        // Backend Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10}$/;
        
        if (!emailRegex.test(nvData.Email)) {
            req.session.error = 'Email không hợp lệ!';
            return res.redirect('/nhanvien/them');
        }
        if (nvData.SoDienThoai && !phoneRegex.test(nvData.SoDienThoai)) {
            req.session.error = 'Số điện thoại phải có đúng 10 chữ số!';
            return res.redirect('/nhanvien/them');
        }

        if (!nvData.MatKhau) nvData.MatKhau = '123456'; 
        const nv = new NhanVien(nvData);
        await nv.save();
        req.session.success = 'Đã thêm nhân viên thành công!';
        res.redirect('/nhanvien');
    } catch (err) {
        req.session.error = 'Lỗi thêm mới: ' + err.message;
        res.redirect('/nhanvien/them');
    }
});

// GET Form sửa nhân viên
router.get('/sua/:id', checkAdmin, async (req, res) => {
    try {
        const nhanvien = await NhanVien.findById(req.params.id);
        const phongbans = await PhongBan.find();
        if(!nhanvien) {
            req.session.error = 'Không tìm thấy nhân viên!';
            return res.redirect('/nhanvien');
        }
        res.render('nhanvien/sua', { 
            title: 'Sửa Thông Tin Nhân Viên',
            nhanvien,
            phongbans,
            path: '/nhanvien/sua'
        });
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/nhanvien');
    }
});

// POST Lưu cập nhật
router.post('/sua/:id', checkAdmin, async (req, res) => {
    try {
        const nvData = req.body;
        
        // Backend Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10}$/;
        
        if (!emailRegex.test(nvData.Email)) {
            req.session.error = 'Email không hợp lệ!';
            return res.redirect('back');
        }
        if (nvData.SoDienThoai && !phoneRegex.test(nvData.SoDienThoai)) {
            req.session.error = 'Số điện thoại phải có đúng 10 chữ số!';
            return res.redirect('back');
        }

        const nhanvien = await NhanVien.findById(req.params.id);
        if (!nhanvien) {
            req.session.error = 'Không tìm thấy nhân viên!';
            return res.redirect('/nhanvien');
        }

        // Cập nhật thông tin cơ bản
        nhanvien.MaNV = nvData.MaNV;
        nhanvien.HoVaTen = nvData.HoVaTen;
        nhanvien.Email = nvData.Email;
        nhanvien.SoDienThoai = nvData.SoDienThoai;
        nhanvien.ChucVu = nvData.ChucVu;
        nhanvien.PhongBan = nvData.PhongBan || null;
        nhanvien.Luong = nvData.Luong || 0;
        nhanvien.TrangThai = nvData.TrangThai;

        // Nếu admin nhập mật khẩu mới thì cập nhật (hook pre-save sẽ tự băm)
        if (nvData.MatKhau && nvData.MatKhau.trim() !== '') {
            nhanvien.MatKhau = nvData.MatKhau;
        }

        await nhanvien.save();
        req.session.success = 'Đã cập nhật thông tin thành công!';
        res.redirect('/nhanvien');
    } catch (err) {
        req.session.error = 'Cập nhật thất bại: ' + err.message;
        res.redirect('/nhanvien/sua/' + req.params.id);
    }
});

// GET Xóa nhân viên
router.get('/xoa/:id', checkAdmin, async (req, res) => {
    try {
        await NhanVien.findByIdAndDelete(req.params.id);
        req.session.success = 'Đã xóa nhân viên thành công!';
        res.redirect('/nhanvien');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/nhanvien');
    }
});

module.exports = router;
