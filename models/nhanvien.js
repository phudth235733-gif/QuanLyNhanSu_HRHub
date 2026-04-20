/**
 * MODEL NHÂN VIÊN
 * Schema Mongoose cho bảng nhân viên trong hệ thống quản lý HR
 * Bao gồm thông tin cá nhân, chức vụ, phòng ban, và quyền truy cập
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const nhanVienSchema = new mongoose.Schema({
    // Mã nhân viên (duy nhất)
    MaNV: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Họ và tên đầy đủ
    HoVaTen: {
        type: String,
        required: true,
        trim: true
    },
    // Email công ty (dùng để đăng nhập và gửi thông báo)
    Email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Số điện thoại liên hệ
    SoDienThoai: {
        type: String,
        trim: true
    },
    // Chức vụ của nhân viên
    ChucVu: {
        type: String,
        required: true,
        default: 'Nhân viên'
    },
    // Tham chiếu đến phòng ban
    PhongBan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhongBan'
    },
    // Ngày vào làm
    NgayVaoLam: {
        type: Date,
        default: Date.now
    },
    // Lương cơ bản
    Luong: {
        type: Number,
        default: 0
    },
    // Trạng thái làm việc
    TrangThai: {
        type: String,
        enum: ['Đang làm việc', 'Đã nghỉ việc', 'Tạm hoãn', 'Nghỉ phép'],
        default: 'Đang làm việc'
    },
    // URL ảnh đại diện/hình nhân viên
    HinhAnh: {
        type: String,
        default: ''
    },
    // Mật khẩu (được mã hóa tự động bởi pre-save hook)
    MatKhau: {
        type: String,
        default: ''
    },
    // Vai trò/Quyền truy cập
    Quyen: {
        type: String,
        enum: ['Admin', 'NhanVien'],
        default: 'NhanVien'
    }
});

/**
 * Middleware pre-save: Tự động mã hóa mật khẩu trước khi lưu
 * Sử dụng bcryptjs để mã hóa mật khẩu với salt rounds = 10
 */
nhanVienSchema.pre('save', async function(next) {
    if (!this.isModified('MatKhau')) return next();
    try {
        if (this.MatKhau) {
            const salt = await bcrypt.genSalt(10);
            this.MatKhau = await bcrypt.hash(this.MatKhau, salt);
        }
        next();
    } catch (err) {
        next(err);
    }
});

module.exports = mongoose.model('NhanVien', nhanVienSchema);
