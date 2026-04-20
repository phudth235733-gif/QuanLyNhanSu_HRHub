/**
 * MODEL CHẤM CÔNG
 * Schema Mongoose cho quản lý chấm công của nhân viên
 * Bao gồm: thời gian check-in/out, số giờ làm, trạng thái (đi muộn, về sớm, OT, ...)
 */

const mongoose = require('mongoose');

const chamCongSchema = new mongoose.Schema({
    // Tham chiếu đến nhân viên
    NhanVien: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NhanVien',
        required: true
    },
    // Ngày chấm công (định dạng: YYYY-MM-DD)
    Ngay: {
        type: String,
        required: true
    },
    // Thời gian check-in (vào công ty)
    CheckIn: {
        type: Date
    },
    // Thời gian check-out (rời công ty)
    CheckOut: {
        type: Date
    },
    // Ghi chú thêm (lý do đi muộn, về sớm, ...)
    GhiChu: {
        type: String,
        default: ''
    },
    // Trạng thái công việc trong ngày
    Status: {
        type: String,
        enum: ['pending', 'present', 'late', 'early_leave', 'absent', 'OT', 'half_day'],
        default: 'pending'
    },
    // Số giờ làm việc trong ngày
    WorkHours: {
        type: Number,
        default: 0
    },
    // Số phút đi muộn
    LateMinutes: {
        type: Number,
        default: 0
    },
    // Số phút về sớm
    EarlyLeaveMinutes: {
        type: Number,
        default: 0
    },
    // Số phút tăng ca (làm thêm)
    OvertimeMinutes: {
        type: Number,
        default: 0
    }
}, { timestamps: true }); // Tự động thêm createdAt và updatedAt

/**
 * Index duy nhất: Đảm bảo mỗi nhân viên chỉ có 1 bản ghi chấm công mỗi ngày
 */
chamCongSchema.index({ NhanVien: 1, Ngay: 1 }, { unique: true });

module.exports = mongoose.model('ChamCong', chamCongSchema);
