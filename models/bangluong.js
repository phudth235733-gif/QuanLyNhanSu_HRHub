/**
 * MODEL BẢNG LƯƠNG
 * Schema Mongoose cho bảng lương của nhân viên
 * Bao gồm: lương cơ bản, thưởng, khấu trừ, thực lãnh, trạng thái thanh toán
 */

const mongoose = require('mongoose');

const bangLuongSchema = new mongoose.Schema({
    // Tham chiếu đến nhân viên
    NhanVien: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NhanVien',
        required: true
    },
    // Kỳ lương (VD: "Tháng 05/2026")
    KyLuong: {
        type: String,
        required: true
    },
    // Lương cơ bản hàng tháng
    LuongCoBan: {
        type: Number,
        default: 0
    },
    // Tiền thưởng (hoa hồng, thưởng hiệu quả, ...)
    Thuong: {
        type: Number,
        default: 0
    },
    // Khấu trừ (bảo hiểm, thuế, ...)
    KhauTru: {
        type: Number,
        default: 0
    },
    // Thực lãnh (Lương cơ bản + Thưởng - Khấu trừ)
    // Được tính tự động bởi pre-save hook
    ThucLanh: {
        type: Number,
        default: 0
    },
    // Trạng thái thanh toán
    TrangThai: {
        type: String,
        enum: ['Chưa thanh toán', 'Đã thanh toán'],
        default: 'Chưa thanh toán'
    }
});

/**
 * Middleware pre-save: Tự động tính thực lãnh trước khi lưu
 * Công thức: Thực lãnh = Lương cơ bản + Thưởng - Khấu trừ
 */
bangLuongSchema.pre('save', function(next) {
    this.ThucLanh = this.LuongCoBan + this.Thuong - this.KhauTru;
    next();
});

module.exports = mongoose.model('BangLuong', bangLuongSchema);
