package com.hotel.hms.identity.service;

import com.hotel.hms.identity.dto.RoleResponse;
import com.hotel.hms.identity.security.AuthUserDetails;

import java.util.List;

public interface RoleAdminService {

    List<RoleResponse> listRoles();

    /** Thay toàn bộ quyền của role; có hiệu lực ngay vì quyền được đọc lại từ database ở mỗi request. */
    RoleResponse updatePermissions(AuthUserDetails actor, String roleCode, List<String> permissionCodes);
}
