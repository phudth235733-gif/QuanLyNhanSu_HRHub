/**
 * MODEL PHÒNG BAN
 * Schema Mongoose cho bảng phòng ban trong hệ thống quản lý HR
 * Bao gồm tên phòng ban, mô tả và ngày thành lập
 */

const mongoose = require('mongoose');

const phongBanSchema = new mongoose.Schema({
    // Tên phòng ban (không được trùng)
    TenPhongBan: {
        type: String,
        required: true,
        trim: true
    },
    // Mô tả về chức năng, nhiệm vụ của phòng ban
    MoTa: {
        type: String,
        trim: true
    },
    // Ngày thành lập phòng ban
    NgayThanhLap: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PhongBan', phongBanSchema);
