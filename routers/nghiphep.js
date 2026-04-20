/**
 * ROUTER QUẢN LÝ NGHỈ PHÉP
 * File này xử lý các route liên quan đến quản lý nghỉ phép:
 * - Danh sách đơn nghỉ phép (Admin xem toàn công ty, nhân viên xem riêng)
 * - Gửi đơn nghỉ phép
 * - Duyệt/từ chối đơn nghỉ phép (Admin)
 * - Xóa đơn nghỉ phép
 * - API lấy danh sách đơn nghỉ phép
 */

const express = require('express');
const router = express.Router();
const NghiPhep = require('../models/nghiphep');
const NhanVien = require('../models/nhanvien');
const moment = require('moment');
const { checkAdmin } = require('../middlewares/auth');

function buildLeaveQuery(session) {
    if (session.userRole === 'Admin') {
        return {};
    }

    return { NhanVien: session.userId };
}

function serializeLeaveRequest(request) {
    return {
        id: request._id,
        nhanVien: request.NhanVien && typeof request.NhanVien === 'object' ? {
            id: request.NhanVien._id,
            hoVaTen: request.NhanVien.HoVaTen,
            maNhanVien: request.NhanVien.MaNhanVien || ''
        } : null,
        tuNgay: request.TuNgay,
        denNgay: request.DenNgay,
        lyDo: request.LyDo,
        loaiNghi: request.LoaiNghi,
        trangThai: request.TrangThai,
        createdAt: request.createdAt
    };
}

// Trang danh sách nghỉ phép
router.get('/', async (req, res) => {
    try {
        const requests = req.session.userRole === 'Admin'
            ? await NghiPhep.find(buildLeaveQuery(req.session)).populate('NhanVien').sort({ createdAt: -1 })
            : await NghiPhep.find(buildLeaveQuery(req.session)).sort({ createdAt: -1 });

        res.render('nghiphep/index', { 
            title: 'Quản Lý Nghỉ Phép',
            path: '/nghiphep',
            requests,
            moment
        });
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/');
    }
});

router.get('/api/requests', async (req, res) => {
    try {
        const query = buildLeaveQuery(req.session);
        const requests = req.session.userRole === 'Admin'
            ? await NghiPhep.find(query).populate('NhanVien').sort({ createdAt: -1 })
            : await NghiPhep.find(query).sort({ createdAt: -1 });

        res.json({
            items: requests.map(serializeLeaveRequest),
            total: requests.length,
            scope: req.session.userRole === 'Admin' ? 'company' : 'self'
        });
    } catch (err) {
        res.status(500).json({ message: 'Không thể tải danh sách nghỉ phép.' });
    }
});

// Gửi đơn nghỉ phép
router.post('/gui-don', async (req, res) => {
    try {
        const { TuNgay, DenNgay, LyDo, LoaiNghi } = req.body;
        
        // Normalize dates to midnight UTC
        const tuNgayDate = new Date(TuNgay + 'T00:00:00Z');
        const denNgayDate = new Date(DenNgay + 'T00:00:00Z');
        
        // Logic validation: Ngày kết thúc không được trước ngày bắt đầu
        if (denNgayDate < tuNgayDate) {
            req.session.error = 'Ngày kết thúc không thể trước ngày bắt đầu!';
            return res.redirect('/nghiphep');
        }

        const newRequest = new NghiPhep({
            NhanVien: req.session.userId,
            TuNgay: tuNgayDate,
            DenNgay: denNgayDate,
            LyDo,
            LoaiNghi
        });
        await newRequest.save();
        req.session.success = 'Gửi đơn nghỉ phép thành công. Vui lòng chờ Admin duyệt!';
        res.redirect('/nghiphep');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/nghiphep');
    }
});

// Admin duyệt đơn
router.get('/duyet/:id', checkAdmin, async (req, res) => {
    try {
        const request = await NghiPhep.findById(req.params.id);
        if (!request) {
            req.session.error = 'Không tìm thấy đơn nghỉ phép!';
            return res.redirect('/nghiphep');
        }

        request.TrangThai = 'Đã duyệt';
        await request.save();

        // Cập nhật trạng thái nhân viên sang 'Nghỉ phép'
        await NhanVien.findByIdAndUpdate(request.NhanVien, { TrangThai: 'Nghỉ phép' });

        req.session.success = 'Đã duyệt đơn nghỉ phép và cập nhật trạng thái nhân viên.';
        res.redirect('/nghiphep');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/nghiphep');
    }
});

// Admin từ chối đơn
router.get('/tu-choi/:id', checkAdmin, async (req, res) => {
    try {
        await NghiPhep.findByIdAndUpdate(req.params.id, { TrangThai: 'Từ chối' });
        req.session.success = 'Đã từ chối đơn nghỉ phép.';
        res.redirect('/nghiphep');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/nghiphep');
    }
});

module.exports = router;
