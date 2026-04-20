/**
 * MODEL THÔNG BÁO
 * Schema Mongoose cho quản lý thông báo từ công ty đến nhân viên
 * Bao gồm: tiêu đề, nội dung, mức độ khẩn cấp, ngày đăng
 */

const mongoose = require('mongoose');

const thongBaoSchema = new mongoose.Schema({
    // Tiêu đề thông báo
    TieuDe: {
        type: String,
        required: true,
        trim: true
    },
    // Nội dung chi tiết của thông báo
    NoiDung: {
        type: String,
        required: true
    },
    // Mức độ khẩn cấp (bình thường hoặc khẩn cấp)
    MucDo: {
        type: String,
        enum: ['Bình thường', 'Khẩn cấp'],
        default: 'Bình thường'
    },
    // Ngày đăng thông báo
    NgayDang: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ThongBao', thongBaoSchema);
