package com.hotel.hms.identity.security;

import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.StaffRepository;
import com.hotel.hms.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nạp user theo email. Được gọi ở mỗi request có token để quyền luôn lấy từ DB,
 * nên đổi quyền (UC-A6) hoặc khóa tài khoản có hiệu lực ngay.
 */
@Service
@RequiredArgsConstructor
public class AuthUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final StaffRepository staffRepository;

    @Override
    @Transactional(readOnly = true)
    public AuthUserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findWithRolesByEmail(email == null ? "" : email.trim())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return AuthUserDetails.from(user, staffRepository.findByUser_IdAndActiveTrue(user.getId()).orElse(null));
    }
}
