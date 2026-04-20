/**
 * MODEL NGHỈ PHÉP
 * Schema Mongoose cho quản lý đơn xin nghỉ phép của nhân viên
 * Bao gồm: thời gian nghỉ, loại nghỉ, lý do, trạng thái duyệt
 */

const mongoose = require('mongoose');

const nghiPhepSchema = new mongoose.Schema({
    // Tham chiếu đến nhân viên gửi đơn
    NhanVien: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NhanVien',
        required: true
    },
    // Ngày bắt đầu nghỉ
    TuNgay: {
        type: Date,
        required: true
    },
    // Ngày kết thúc nghỉ
    DenNgay: {
        type: Date,
        required: true
    },
    // Lý do xin nghỉ phép
    LyDo: {
        type: String,
        required: true
    },
    // Loại hình nghỉ phép
    LoaiNghi: {
        type: String,
        enum: ['Nghỉ có phép', 'Nghỉ không phép', 'Nghỉ ốm', 'Việc riêng'],
        default: 'Nghỉ có phép'
    },
    // Trạng thái xử lý đơn
    TrangThai: {
        type: String,
        enum: ['Chờ duyệt', 'Đã duyệt', 'Từ chối'],
        default: 'Chờ duyệt'
    },
    // Phản hồi/ghi chú từ Admin khi duyệt hoặc từ chối
    PhanHoiAdmin: {
        type: String,
        default: ''
    }
}, { timestamps: true }); // Tự động thêm createdAt và updatedAt

module.exports = mongoose.model('NghiPhep', nghiPhepSchema);
