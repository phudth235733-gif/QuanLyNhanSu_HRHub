// Frontend script for UI interactions
document.addEventListener('DOMContentLoaded', () => {
    const formatDate = value => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('vi-VN');
    };

    const formatDateTime = value => {
        if (!value) return '-';
        return new Date(value).toLocaleTimeString('vi-VN');
    };

    const escapeHtml = value => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const attendanceStatusClass = status => {
        if (status === 'present' || status === 'OT') return 'status-success';
        if (status === 'late' || status === 'early_leave' || status === 'half_day') return 'status-warning';
        if (status === 'absent') return 'status-danger';
        return 'status-warning';
    };

    async function parseApiResponse(response, fallbackMessage) {
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const data = isJson ? await response.json() : null;

        if (!response.ok) {
            const message = data?.message || fallbackMessage;
            throw new Error(message);
        }

        if (!isJson) {
            throw new Error('API không trả về đúng định dạng JSON.');
        }

        return data;
    }

    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    if (alerts.length > 0) {
        setTimeout(() => {
            alerts.forEach(alert => {
                alert.style.opacity = '0';
                alert.style.transform = 'translateY(-10px)';
                alert.style.transition = 'all 0.3s ease';
                setTimeout(() => alert.remove(), 300);
            });
        }, 5000);
    }

    // Close alert manually
    document.querySelectorAll('.alert-close').forEach(button => {
        button.addEventListener('click', () => {
            const alert = button.closest('.alert');
            if (!alert) return;
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => alert.remove(), 300);
        });
    });

    // Add gentle micro-animations to table rows
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    tableRows.forEach((row, index) => {
        row.style.animation = `fadeIn 0.3s ease-out ${index * 0.05}s forwards`;
        row.style.opacity = '0';
    });

    const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
    const dashboardApiScope = document.getElementById('dashboardApiScope');
    const dashboardLastUpdated = document.getElementById('dashboardLastUpdated');

    async function refreshDashboardOverview() {
        if (!refreshDashboardBtn) return;

        const originalText = refreshDashboardBtn.innerHTML;
        refreshDashboardBtn.disabled = true;
        refreshDashboardBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';

        try {
            const response = await fetch('/api/dashboard/overview');
            const data = await parseApiResponse(response, 'Không thể tải dữ liệu dashboard.');

            document.querySelectorAll('[data-dashboard-field]').forEach(node => {
                const field = node.dataset.dashboardField;
                if (field && data[field] !== undefined) {
                    node.textContent = data[field];
                }
            });

            if (dashboardApiScope) {
                dashboardApiScope.textContent = data.apiScope || 'Cá nhân';
            }

            if (dashboardLastUpdated && data.lastUpdatedAt) {
                dashboardLastUpdated.textContent = new Date(data.lastUpdatedAt).toLocaleString('vi-VN');
            }
        } catch (error) {
            console.error(error);
            alert(error.message || 'Không thể tải dữ liệu dashboard.');
        } finally {
            refreshDashboardBtn.disabled = false;
            refreshDashboardBtn.innerHTML = originalText;
        }
    }

    if (refreshDashboardBtn) {
        refreshDashboardBtn.addEventListener('click', refreshDashboardOverview);
    }

    const refreshNoticesBtn = document.getElementById('refreshNoticesBtn');
    const noticeTableBody = document.getElementById('noticeTableBody');

    async function refreshNotices() {
        if (!refreshNoticesBtn || !noticeTableBody) return;

        const originalText = refreshNoticesBtn.innerHTML;
        refreshNoticesBtn.disabled = true;
        refreshNoticesBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';

        try {
            const response = await fetch('/api/thongbao/latest?limit=10');
            const data = await parseApiResponse(response, 'Không thể tải thông báo.');

            if (!data.items.length) {
                noticeTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center empty-state" style="padding: 2rem;">
                            <p>Chưa có thông báo nào từ ban giám đốc.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            noticeTableBody.innerHTML = data.items.map(item => {
                const mucDoClass = item.mucDo === 'Khẩn cấp' ? 'status-danger' : 'status-success';
                const title = escapeHtml(item.tieuDe);
                const ngayDang = formatDate(item.ngayDang);
                const mucDo = escapeHtml(item.mucDo);

                return `
                    <tr>
                        <td>${ngayDang}</td>
                        <td class="fw-500">
                            <a href="javascript:void(0)" class="text-dark notice-detail-btn" style="text-decoration: none;"
                               data-tieu-de="${escapeHtml(item.tieuDe)}"
                               data-noi-dung="${escapeHtml(item.noiDung)}"
                               data-ngay-dang="${escapeHtml(ngayDang)}"
                               data-muc-do="${escapeHtml(item.mucDo)}">
                               ${title}
                            </a>
                        </td>
                        <td><span class="status ${mucDoClass}">${mucDo}</span></td>
                        <td class="text-right">
                            <button class="action-btn btn-view notice-detail-btn" title="Xem Chi Tiết"
                                data-tieu-de="${escapeHtml(item.tieuDe)}"
                                data-noi-dung="${escapeHtml(item.noiDung)}"
                                data-ngay-dang="${escapeHtml(ngayDang)}"
                                data-muc-do="${escapeHtml(item.mucDo)}">
                                <i class="fa-solid fa-eye text-primary"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            noticeTableBody.querySelectorAll('.notice-detail-btn').forEach(button => {
                button.addEventListener('click', () => {
                    showNoticeDetail(
                        button.dataset.tieuDe || '',
                        button.dataset.noiDung || '',
                        button.dataset.ngayDang || '',
                        button.dataset.mucDo || ''
                    );
                });
            });
        } catch (error) {
            console.error(error);
            alert(error.message || 'Không thể tải thông báo.');
        } finally {
            refreshNoticesBtn.disabled = false;
            refreshNoticesBtn.innerHTML = originalText;
        }
    }

    if (refreshNoticesBtn) {
        refreshNoticesBtn.addEventListener('click', refreshNotices);
    }

    const refreshLeaveRequestsBtn = document.getElementById('refreshLeaveRequestsBtn');
    const leaveRequestsTableBody = document.getElementById('leaveRequestsTableBody');

    async function refreshLeaveRequests() {
        if (!refreshLeaveRequestsBtn || !leaveRequestsTableBody) return;

        const isAdmin = leaveRequestsTableBody.dataset.isAdmin === 'true';
        const originalText = refreshLeaveRequestsBtn.innerHTML;
        refreshLeaveRequestsBtn.disabled = true;
        refreshLeaveRequestsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';

        try {
            const response = await fetch('/nghiphep/api/requests');
            const data = await parseApiResponse(response, 'Không thể tải danh sách nghỉ phép.');

            if (!data.items.length) {
                leaveRequestsTableBody.innerHTML = `
                    <tr>
                        <td colspan="${isAdmin ? 6 : 5}" class="text-center" style="padding: 3rem;">Chưa có đơn nghỉ phép nào được tạo.</td>
                    </tr>
                `;
                return;
            }

            leaveRequestsTableBody.innerHTML = data.items.map(item => {
                const reason = escapeHtml(item.lyDo);
                const shortReason = reason.length > 30 ? `${reason.substring(0, 30)}...` : reason;
                const statusClass = item.trangThai === 'Chờ duyệt'
                    ? 'status-warning'
                    : item.trangThai === 'Đã duyệt'
                        ? 'status-success'
                        : 'status-danger';
                const employeeCell = isAdmin
                    ? `<td><strong>${escapeHtml(item.nhanVien?.hoVaTen || 'N/A')}</strong></td>`
                    : '';
                const actionCell = isAdmin && item.trangThai === 'Chờ duyệt'
                    ? `
                        <a href="/nghiphep/duyet/${item.id}" class="action-btn btn-view" title="Duyệt" style="color: var(--success);"><i class="fa-solid fa-check-circle"></i></a>
                        <a href="/nghiphep/tu-choi/${item.id}" class="action-btn btn-delete" title="Từ chối"><i class="fa-solid fa-times-circle"></i></a>
                    `
                    : '<span class="text-muted" style="font-size: 0.8rem;">Không có thao tác</span>';

                return `
                    <tr>
                        ${employeeCell}
                        <td>${escapeHtml(item.loaiNghi)}</td>
                        <td>
                            <div style="font-size: 0.85rem;">
                                Từ: ${formatDate(item.tuNgay)}<br>
                                Đến: ${formatDate(item.denNgay)}
                            </div>
                        </td>
                        <td><span title="${reason}" style="cursor: help;">${shortReason}</span></td>
                        <td><span class="status ${statusClass}">${escapeHtml(item.trangThai)}</span></td>
                        <td class="actions-col">${actionCell}</td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error(error);
            alert(error.message || 'Không thể tải danh sách nghỉ phép.');
        } finally {
            refreshLeaveRequestsBtn.disabled = false;
            refreshLeaveRequestsBtn.innerHTML = originalText;
        }
    }

    if (refreshLeaveRequestsBtn) {
        refreshLeaveRequestsBtn.addEventListener('click', refreshLeaveRequests);
    }

    const refreshAttendanceBtn = document.getElementById('refreshAttendanceBtn');
    const attendanceHistoryTableBody = document.getElementById('attendanceHistoryTableBody');

    async function refreshAttendanceHistory() {
        if (!refreshAttendanceBtn || !attendanceHistoryTableBody) return;

        const isAdmin = attendanceHistoryTableBody.dataset.isAdmin === 'true';
        const filterForm = document.querySelector('form[action="/chamcong"]');
        const params = filterForm ? new URLSearchParams(new FormData(filterForm)) : new URLSearchParams();
        const originalText = refreshAttendanceBtn.innerHTML;
        refreshAttendanceBtn.disabled = true;
        refreshAttendanceBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';

        try {
            const response = await fetch(`/chamcong/api/overview?${params.toString()}`);
            const data = await parseApiResponse(response, 'Không thể tải dữ liệu chấm công.');

            if (!data.history.length) {
                attendanceHistoryTableBody.innerHTML = `
                    <tr>
                        <td colspan="${isAdmin ? 7 : 6}" class="text-center">Chưa có dữ liệu chấm công.</td>
                    </tr>
                `;
                return;
            }

            attendanceHistoryTableBody.innerHTML = data.history.map(item => {
                const employeeCell = isAdmin
                    ? `<td><strong>${escapeHtml(item.nhanVien?.hoVaTen || 'N/A')}</strong></td>`
                    : '';
                const status = escapeHtml((item.status || 'pending').toUpperCase().replace('_', '/'));
                return `
                    <tr>
                        ${employeeCell}
                        <td>${escapeHtml(item.ngay)}</td>
                        <td>${item.checkIn ? formatDateTime(item.checkIn) : '-'}</td>
                        <td>${item.checkOut ? formatDateTime(item.checkOut) : '-'}</td>
                        <td>${item.checkOut || item.workHours === 0 ? `${item.workHours}h` : '-'}</td>
                        <td>${item.checkOut || item.lateMinutes === 0 ? `${item.lateMinutes}p` : '-'}</td>
                        <td><span class="status ${attendanceStatusClass(item.status)}">${status}</span></td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error(error);
            alert(error.message || 'Không thể tải dữ liệu chấm công.');
        } finally {
            refreshAttendanceBtn.disabled = false;
            refreshAttendanceBtn.innerHTML = originalText;
        }
    }

    if (refreshAttendanceBtn) {
        refreshAttendanceBtn.addEventListener('click', refreshAttendanceHistory);
    }
});
