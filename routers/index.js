/**
 * ROUTER TRANG CHỦ (DASHBOARD)
 * File này xử lý các route trang chủ và dashboard của ứng dụng quản lý nhân sự
 */

const express = require('express');
const router = express.Router();
const NhanVien = require('../models/nhanvien');
const PhongBan = require('../models/phongban');
const ThongBao = require('../models/thongbao');
const NghiPhep = require('../models/nghiphep');
const { checkAdmin } = require('../middlewares/auth');

/**
 * Hàm lấy dữ liệu dashboard
 * Bao gồm: tổng nhân viên, phòng ban, nhân viên đang làm, thông báo, thống kê phòng ban
 * @param {Object} session - Phiên đăng nhập của người dùng
 * @returns {Promise<Object>} Dữ liệu dashboard
 */
async function getDashboardData(session) {
    const now = new Date();
    
    // Tạo date đầu ngày và cuối ngày hôm nay dựa trên UTC (để đồng bộ với cách lưu date)
    // Lấy ngày hiện tại (YYYY-MM-DD) và convert thành UTC midnight
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const date = now.getUTCDate();
    
    const todayDate = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
    const tomorrowDate = new Date(Date.UTC(year, month, date + 1, 0, 0, 0, 0));

    const leaveTodayQuery = {
        TrangThai: 'Đã duyệt',
        TuNgay: { $lt: tomorrowDate },
        DenNgay: { $gte: todayDate }
    };

    const [
        totalNhanVien,
        totalPhongBan,
        doingWork,
        thongbaos,
        pbStats
    ] = await Promise.all([
        NhanVien.countDocuments(),
        PhongBan.countDocuments(),
        NhanVien.countDocuments({ TrangThai: 'Đang làm việc' }),
        ThongBao.find().sort({ NgayDang: -1 }).limit(10),
        NhanVien.aggregate([
            { $group: { _id: '$PhongBan', count: { $sum: 1 } } }
        ])
    ]);

    let nghiPhepHomNay = 0;
    let scopeLabel = 'Cá nhân';

    if (session.userRole === 'Admin') {
        const nghiPhepHomNayNhanVienIds = await NghiPhep.distinct('NhanVien', leaveTodayQuery);
        nghiPhepHomNay = nghiPhepHomNayNhanVienIds.length;
        scopeLabel = 'Toàn công ty';
    } else {
        const hasLeaveToday = await NghiPhep.exists({
            ...leaveTodayQuery,
            NhanVien: session.userId
        });
        nghiPhepHomNay = hasLeaveToday ? 1 : 0;
    }

    const populatedStats = await Promise.all(pbStats.map(async stat => {
        if (stat._id) {
            const pb = await PhongBan.findById(stat._id);
            return { name: pb ? pb.TenPhongBan : 'Khác', count: stat.count };
        }

        return { name: 'Chưa phân bổ', count: stat.count };
    }));

    return {
        totalNhanVien,
        totalPhongBan,
        doingWork,
        nghiPhepHomNay,
        thongbaos,
        pbStats: populatedStats,
        apiScope: scopeLabel,
        lastUpdatedAt: new Date().toISOString()
    };
}

/**
 * Hàm chuyển đổi dữ liệu thông báo thành định dạng JSON
 * @param {Object} thongBao - Đối tượng thông báo từ database
 * @returns {Object} Thông báo đã format
 */
function serializeThongBao(thongBao) {
    return {
        id: thongBao._id,
        tieuDe: thongBao.TieuDe,
        noiDung: thongBao.NoiDung,
        mucDo: thongBao.MucDo,
        ngayDang: thongBao.NgayDang
    };
}

router.get('/', async (req, res) => {
    try {
        const dashboardData = await getDashboardData(req.session);

        res.render('index', { 
            title: 'Dashboard HRHub',
            ...dashboardData,
            path: '/'
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Lỗi máy chủ');
    }
});

router.get('/api/dashboard/overview', async (req, res) => {
    try {
        const dashboardData = await getDashboardData(req.session);

        res.json({
            totalNhanVien: dashboardData.totalNhanVien,
            totalPhongBan: dashboardData.totalPhongBan,
            doingWork: dashboardData.doingWork,
            nghiPhepHomNay: dashboardData.nghiPhepHomNay,
            apiScope: dashboardData.apiScope,
            lastUpdatedAt: dashboardData.lastUpdatedAt
        });
    } catch (err) {
        res.status(500).json({ message: 'Không thể tải dữ liệu dashboard.' });
    }
});

router.get('/api/thongbao/latest', async (req, res) => {
    try {
        const parsedLimit = Number(req.query.limit || 10);
        const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 20) : 10;
        const thongbaos = await ThongBao.find().sort({ NgayDang: -1 }).limit(limit);

        res.json({
            items: thongbaos.map(serializeThongBao),
            total: thongbaos.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Không thể tải danh sách thông báo.' });
    }
});

// THÊM THÔNG BÁO
router.post('/thongbao/them', checkAdmin, async (req, res) => {
    try {
        const { TieuDe, NoiDung, MucDo } = req.body;
        
        if (!TieuDe || TieuDe.trim() === '' || !NoiDung || NoiDung.trim() === '') {
            req.session.error = 'Tiêu đề và Nội dung thông báo không được để trống!';
            return res.redirect('/');
        }

        const tb = new ThongBao({ TieuDe: TieuDe.trim(), NoiDung: NoiDung.trim(), MucDo });
        await tb.save();
        req.session.success = 'Đã đăng thông báo mới thành công!';
        res.redirect('/');
    } catch (err) {
        req.session.error = 'Lỗi khi đăng thông báo: ' + err.message;
        res.redirect('/');
    }
});

// XÓA THÔNG BÁO
router.get('/thongbao/xoa/:id', checkAdmin, async (req, res) => {
    try {
        await ThongBao.findByIdAndDelete(req.params.id);
        req.session.success = 'Đã xóa thông báo thành công!';
        res.redirect('/');
    } catch (err) {
        req.session.error = 'Lỗi khi xóa: ' + err.message;
        res.redirect('/');
    }
});

// SỬA THÔNG BÁO (Lấy thông tin lẹ bằng AJAX hoặc query - ở đây làm đơn giản qua form POST)
router.post('/thongbao/sua/:id', checkAdmin, async (req, res) => {
    try {
        const { TieuDe, NoiDung, MucDo } = req.body;

        if (!TieuDe || TieuDe.trim() === '' || !NoiDung || NoiDung.trim() === '') {
            req.session.error = 'Tiêu đề và Nội dung không được để trống!';
            return res.redirect('/');
        }

        await ThongBao.findByIdAndUpdate(req.params.id, { TieuDe: TieuDe.trim(), NoiDung: NoiDung.trim(), MucDo });
        req.session.success = 'Đã cập nhật thông báo thành công!';
        res.redirect('/');
    } catch (err) {
        req.session.error = 'Lỗi khi cập nhật: ' + err.message;
        res.redirect('/');
    }
});

module.exports = router;
