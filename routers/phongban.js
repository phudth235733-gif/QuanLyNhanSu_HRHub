/**
 * ROUTER QUẢN LÝ PHÒNG BAN
 * File này xử lý các route liên quan đến quản lý phòng ban:
 * - Danh sách phòng ban với số lượng nhân viên
 * - Thêm phòng ban mới
 * - Cập nhật thông tin phòng ban
 * - Xóa phòng ban (nếu không có nhân viên)
 */

const express = require('express');
const router = express.Router();
const PhongBan = require('../models/phongban');
const NhanVien = require('../models/nhanvien');
const { checkAdmin } = require('../middlewares/auth');

// Danh sách phòng ban
router.get('/', checkAdmin, async (req, res) => {
    try {
        let filter = {};
        if (req.query.q) {
            filter.TenPhongBan = { $regex: req.query.q, $options: 'i' };
        }
        const phongbansRaw = await PhongBan.find(filter);
        
        // Đếm số lượng nhân viên thực tế cho mỗi phòng ban
        const phongbans = await Promise.all(phongbansRaw.map(async (pb) => {
            const count = await NhanVien.countDocuments({ PhongBan: pb._id });
            return {
                ...pb.toObject(),
                soNhanVien: count
            };
        }));

        res.render('phongban/index', { 
            title: 'Phòng Ban', 
            phongbans,
            path: '/phongban',
            keyword: req.query.q || ''
        });
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/');
    }
});

// THÊM: Action
router.post('/them', checkAdmin, async (req, res) => {
    try {
        const { TenPhongBan, MoTa } = req.body;
        
        if (!TenPhongBan || TenPhongBan.trim() === '') {
            req.session.error = 'Tên phòng ban không được để trống!';
            return res.redirect('/phongban');
        }

        const pb = new PhongBan({
            TenPhongBan: TenPhongBan.trim(),
            MoTa: MoTa
        });
        await pb.save();
        req.session.success = 'Đã thêm phòng ban thành công!';
        res.redirect('/phongban');
    } catch (err) {
        req.session.error = 'Lỗi khi thêm: ' + err.message;
        res.redirect('/phongban');
    }
});

// XÓA: Action
router.get('/xoa/:id', checkAdmin, async (req, res) => {
    try {
        // Kiểm tra xem có NhanVien trong phòng ban này không
        const count = await NhanVien.countDocuments({ PhongBan: req.params.id });
        if(count > 0) {
            req.session.error = 'Không thể xóa phòng ban có chứa nhân viên!';
            return res.redirect('/phongban');
        }
        await PhongBan.findByIdAndDelete(req.params.id);
        req.session.success = 'Đã xóa phòng ban thành công!';
        res.redirect('/phongban');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/phongban');
    }
});

// SỬA: Action
router.post('/sua/:id', checkAdmin, async (req, res) => {
    try {
        const { TenPhongBan, MoTa } = req.body;

        if (!TenPhongBan || TenPhongBan.trim() === '') {
            req.session.error = 'Tên phòng ban không được để trống!';
            return res.redirect('/phongban');
        }

        await PhongBan.findByIdAndUpdate(req.params.id, { TenPhongBan: TenPhongBan.trim(), MoTa });
        req.session.success = 'Đã cập nhật phòng ban thành công!';
        res.redirect('/phongban');
    } catch (err) {
        req.session.error = 'Lỗi khi cập nhật: ' + err.message;
        res.redirect('/phongban');
    }
});

module.exports = router;
