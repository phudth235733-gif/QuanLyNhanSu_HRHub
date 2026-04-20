/**
 * ROUTER QUẢN LÝ CHẤM CÔNG
 * File này xử lý các route liên quan đến chấm công:
 * - Danh sách chấm công (Admin xem toàn công ty, nhân viên xem riêng)
 * - Check in / Check out
 * - Xem lịch sử chấm công
 * - Báo cáo chấm công
 * - API lấy dữ liệu chấm công
 */

const express = require('express');
const router = express.Router();
const ChamCong = require('../models/chamcong');
const NhanVien = require('../models/nhanvien');
const moment = require('moment');
const { getAttendanceStatus } = require('../utils/attendance');

async function buildAttendanceViewData(session, query) {
    const userId = session.userId;
    const todayStr = moment().format('YYYY-MM-DD');
    const { fromDate, toDate, employeeName } = query;

    const todayAttendance = await ChamCong.findOne({ NhanVien: userId, Ngay: todayStr });

    const historyQuery = {};
    if (session.userRole !== 'Admin') {
        historyQuery.NhanVien = userId;
    }
    if (fromDate && toDate) {
        historyQuery.Ngay = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
        historyQuery.Ngay = fromDate;
    } else if (toDate) {
        historyQuery.Ngay = toDate;
    }

    if (session.userRole === 'Admin' && employeeName) {
        const matchedEmployees = await NhanVien.find({ HoVaTen: { $regex: employeeName, $options: 'i' } }).select('_id');
        const employeeIds = matchedEmployees.map(emp => emp._id);
        historyQuery.NhanVien = { $in: employeeIds.length > 0 ? employeeIds : [null] };
    }

    const history = session.userRole === 'Admin'
        ? await ChamCong.find(historyQuery).populate('NhanVien').sort({ Ngay: -1 }).limit(20)
        : await ChamCong.find(historyQuery).sort({ Ngay: -1 }).limit(10);

    return {
        todayStr,
        todayAttendance,
        history,
        fromDate: fromDate || '',
        toDate: toDate || '',
        employeeName: employeeName || ''
    };
}

function serializeAttendance(record, isAdmin) {
    return {
        id: record._id,
        nhanVien: isAdmin && record.NhanVien && typeof record.NhanVien === 'object' ? {
            id: record.NhanVien._id,
            hoVaTen: record.NhanVien.HoVaTen
        } : null,
        ngay: record.Ngay,
        checkIn: record.CheckIn,
        checkOut: record.CheckOut,
        workHours: record.WorkHours,
        lateMinutes: record.LateMinutes,
        earlyLeaveMinutes: record.EarlyLeaveMinutes,
        overtimeMinutes: record.OvertimeMinutes,
        status: record.Status
    };
}

// Trang chấm công chính
router.get('/', async (req, res) => {
    try {
        const {
            todayAttendance,
            history,
            fromDate,
            toDate,
            employeeName
        } = await buildAttendanceViewData(req.session, req.query);

        res.render('chamcong/index', { 
            title: 'Chấm Công',
            path: '/chamcong',
            todayAttendance,
            history,
            moment,
            fromDate: fromDate || '',
            toDate: toDate || '',
            employeeName: employeeName || ''
        });
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/');
    }
});

router.get('/api/overview', async (req, res) => {
    try {
        const { todayStr, todayAttendance, history, fromDate, toDate, employeeName } = await buildAttendanceViewData(req.session, req.query);
        const isAdmin = req.session.userRole === 'Admin';

        res.json({
            today: {
                ngay: todayStr,
                record: todayAttendance ? serializeAttendance(todayAttendance, isAdmin) : null
            },
            history: history.map(item => serializeAttendance(item, isAdmin)),
            filters: {
                fromDate,
                toDate,
                employeeName
            },
            scope: isAdmin ? 'company' : 'self'
        });
    } catch (err) {
        res.status(500).json({ message: 'Không thể tải dữ liệu chấm công.' });
    }
});

// Xử lý Check-in
router.post('/checkin', async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayStr = moment().format('YYYY-MM-DD');
        
        const existing = await ChamCong.findOne({ NhanVien: userId, Ngay: todayStr });
        if (existing) {
            req.session.error = 'Bạn đã check-in hôm nay rồi!';
            return res.redirect('/chamcong');
        }

        const newRecord = new ChamCong({
            NhanVien: userId,
            Ngay: todayStr,
            CheckIn: new Date()
        });
        await newRecord.save();
        
        req.session.success = 'Check-in thành công!';
        res.redirect('/chamcong');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/chamcong');
    }
});

// Xử lý Check-out
router.post('/checkout', async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayStr = moment().format('YYYY-MM-DD');
        
        const record = await ChamCong.findOne({ NhanVien: userId, Ngay: todayStr });
        if (!record) {
            req.session.error = 'Bạn chưa check-in hôm nay!';
            return res.redirect('/chamcong');
        }
        if (record.CheckOut) {
            req.session.error = 'Bạn đã check-out hôm nay rồi!';
            return res.redirect('/chamcong');
        }

        const now = new Date();
        if (now < record.CheckIn) {
            req.session.error = 'Lỗi thời gian: Giờ ra không thể trước giờ vào!';
            return res.redirect('/chamcong');
        }

        record.CheckOut = now;

        const attendance = getAttendanceStatus(record.CheckIn, now, todayStr);
        record.WorkHours = attendance.workHours;
        record.LateMinutes = attendance.lateMinutes;
        record.EarlyLeaveMinutes = attendance.earlyLeaveMinutes;
        record.OvertimeMinutes = attendance.overtimeMinutes;
        record.Status = attendance.status;

        await record.save();
        
        let successMsg = `Check-out thành công! Giờ làm: ${record.WorkHours}h`;
        if (attendance.lateMinutes > 0) successMsg += ` (Trễ ${attendance.lateMinutes}p)`;
        if (attendance.earlyLeaveMinutes > 0) successMsg += ` (Ra sớm ${attendance.earlyLeaveMinutes}p)`;
        if (attendance.overtimeMinutes > 0) successMsg += ` (OT ${Math.floor(attendance.overtimeMinutes / 60)}h${attendance.overtimeMinutes % 60}p)`;
        if (attendance.status === 'half_day') successMsg += ' (Làm nửa ngày)';
        if (attendance.status === 'early_leave') successMsg += ' (Về sớm)';
        if (attendance.status === 'late') successMsg += ' (Đi muộn)';

        req.session.success = successMsg;
        res.redirect('/chamcong');
    } catch (err) {
        req.session.error = err.message;
        res.redirect('/chamcong');
    }
});

module.exports = router;
