/**
 * Middleware xác thực và phân quyền
 * File này chứa các middleware để kiểm tra quyền truy cập của người dùng
 */

/**
 * Middleware kiểm tra người dùng đã đăng nhập hay chưa
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Hàm tiếp theo
 */
const checkAuth = (req, res, next) => {
    if (!req.session.userId) {
        req.session.error = 'Vui lòng đăng nhập để tiếp tục.';
        return res.redirect('/auth/login');
    }
    next();
};

/**
 * Middleware kiểm tra quyền Admin
 * Chỉ cho phép người dùng có vai trò Admin truy cập
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Hàm tiếp theo
 */
const checkAdmin = (req, res, next) => {
    if (req.session.userRole !== 'Admin') {
        req.session.error = 'Bạn không có quyền truy cập chức năng này.';
        return res.redirect('/');
    }
    next();
};

/**
 * Middleware kiểm tra quyền Admin - dùng cho API
 * Trả về JSON thay vì redirect
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Hàm tiếp theo
 */
const checkAdminAPI = (req, res, next) => {
    if (req.session.userRole !== 'Admin') {
        return res.status(403).json({ 
            message: 'Bạn không có quyền thực hiện chức năng này.' 
        });
    }
    next();
};

module.exports = {
    checkAuth,
    checkAdmin,
    checkAdminAPI
};
