/**
 * UTILITY CHẤM CÔNG
 * File này chứa các hàm và hằng số để tính toán trạng thái chấm công
 * Bao gồm: tính toán giờ làm, phát hiện đi muộn, về sớm, làm thêm giờ, ...
 */

const moment = require('moment');

// ========== HẰNG SỐ ĐỊA PHƯƠNG ==========
// Giờ check-in chuẩn (giờ vào làm việc)
const STANDARD_CHECKIN = '08:30:00';
// Giờ check-out chuẩn (giờ ra về)
const STANDARD_CHECKOUT = '17:30:00';
// Số phút làm việc tiêu chuẩn trong ngày (8 giờ = 480 phút)
const STANDARD_WORK_MINUTES = 8 * 60;
// Ngưỡng đi muộn (nếu vào trễ hơn 30 phút)
const LATE_THRESHOLD_MINUTES = 30;
// Ngưỡng về sớm (nếu ra sớm hơn 30 phút)
const EARLY_LEAVE_THRESHOLD_MINUTES = 30;
// Giờ công nửa ngày (4 giờ = 240 phút)
const HALF_DAY_MINUTES = 4 * 60;

/**
 * Hàm lấy thời gian chuẩn (check-in và check-out) của một ngày
 * @param {string} dayString - Ngày cần lấy (định dạng: YYYY-MM-DD)
 * @returns {Object} Chứa standardCheckin và standardCheckout là moment objects
 */
function getStandardMoments(dayString) {
    return {
        standardCheckin: moment(`${dayString} ${STANDARD_CHECKIN}`, 'YYYY-MM-DD HH:mm:ss'),
        standardCheckout: moment(`${dayString} ${STANDARD_CHECKOUT}`, 'YYYY-MM-DD HH:mm:ss')
    };
}

/**
 * Hàm tính toán trạng thái chấm công của một nhân viên trong một ngày
 * @param {Date} checkInTime - Thời gian check-in (vào công ty)
 * @param {Date} checkOutTime - Thời gian check-out (rời công ty)
 * @param {string} dayString - Ngày chấm công (định dạng: YYYY-MM-DD)
 * @returns {Object} Chứa:
 *   - workMinutes: số phút làm việc
 *   - workHours: số giờ làm việc
 *   - lateMinutes: số phút đi muộn
 *   - earlyLeaveMinutes: số phút về sớm
 *   - overtimeMinutes: số phút làm thêm
 *   - status: trạng thái (absent, pending, present, OT, half_day, late, early_leave)
 */
function getAttendanceStatus(checkInTime, checkOutTime, dayString) {
    const result = {
        workMinutes: 0,
        workHours: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        status: 'absent' // Mặc định là vắng mặt nếu không có check-in
    };

    // Nếu không có thời gian check-in thì là vắng mặt
    if (!checkInTime) {
        return result;
    }

    const checkInMoment = moment(checkInTime);
    if (!checkInMoment.isValid()) {
        throw new Error('Thời gian check-in không hợp lệ.');
    }

    // Nếu có check-in nhưng chưa check-out thì trạng thái là chờ xử lý
    if (!checkOutTime) {
        return {
            ...result,
            status: 'pending'
        };
    }

    const checkOutMoment = moment(checkOutTime);
    if (!checkOutMoment.isValid() || checkOutMoment.isBefore(checkInMoment)) {
        throw new Error('Thời gian check-out không hợp lệ.');
    }

    // Tính toán các chỉ số chấm công
    const { standardCheckin, standardCheckout } = getStandardMoments(dayString);
    const workMinutes = checkOutMoment.diff(checkInMoment, 'minutes'); // Tổng thời gian làm việc
    const lateMinutes = Math.max(0, checkInMoment.diff(standardCheckin, 'minutes')); // Đi muộn bao nhiêu phút
    const earlyLeaveMinutes = Math.max(0, standardCheckout.diff(checkOutMoment, 'minutes')); // Về sớm bao nhiêu phút
    const overtimeMinutes = Math.max(0, workMinutes - STANDARD_WORK_MINUTES); // Làm thêm bao nhiêu phút
    const workHours = Math.round((workMinutes / 60) * 100) / 100; // Chuyển đổi phút sang giờ

    // Xác định trạng thái dựa trên các chỉ số tính toán
    let status = 'present'; // Mặc định là có mặt
    if (overtimeMinutes > 0) {
        status = 'OT'; // Có làm thêm giờ
    } else if (workMinutes < HALF_DAY_MINUTES) {
        status = 'half_day'; // Làm việc dưới 4 giờ = nửa ngày
    } else if (lateMinutes > LATE_THRESHOLD_MINUTES) {
        status = 'late'; // Vào trễ quá 30 phút
    } else if (earlyLeaveMinutes > EARLY_LEAVE_THRESHOLD_MINUTES) {
        status = 'early_leave'; // Ra sớm quá 30 phút
    }

    return {
        workMinutes,
        workHours,
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        status
    };
}

module.exports = {
    STANDARD_WORK_MINUTES,
    LATE_THRESHOLD_MINUTES,
    EARLY_LEAVE_THRESHOLD_MINUTES,
    HALF_DAY_MINUTES,
    getAttendanceStatus
};
