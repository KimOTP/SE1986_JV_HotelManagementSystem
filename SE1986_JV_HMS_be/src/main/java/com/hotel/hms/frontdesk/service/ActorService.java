package com.hotel.hms.frontdesk.service;

import com.hotel.hms.frontdesk.entity.StaffAccount;
import com.hotel.hms.frontdesk.entity.UserAccount;
import com.hotel.hms.frontdesk.repository.StaffAccountRepository;
import com.hotel.hms.frontdesk.repository.UserAccountRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;

@Service
public class ActorService {
    @Autowired private UserAccountRepository userRepository;
    @Autowired private StaffAccountRepository staffRepository;
    @Autowired private Environment environment;
    @Value("${frontdesk.dev-actor-id:0}") private long demoActorId;

    @Data @AllArgsConstructor
    public static class Actor {
        private long id;
        private Long hotelId;
        private boolean admin;
    }

    @Transactional(readOnly = true)
    public Actor require(Principal principal, String permission) {
        String email = principal == null ? null : principal.getName();
        boolean demo = (email == null || email.isBlank())
                && demoActorId > 0 && environment.acceptsProfiles(Profiles.of("dev"));
        if ((email == null || email.isBlank()) && !demo) {
            throw new ApiException(HttpStatus.UNAUTHORIZED,
                    "Cần phiên đăng nhập của backend hoặc bật profile dev trong môi trường kiểm thử.");
        }
        UserAccount user = demo
                ? userRepository.findById(demoActorId).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản demo."))
                : userRepository.findByEmailIgnoreCaseAndActiveTrue(email).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại hoặc đã vô hiệu hóa."));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Tài khoản đã vô hiệu hóa.");
        }
        if (userRepository.countAllowed(user.getId(), permission) == 0) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền " + permission);
        }
        boolean admin = userRepository.countAdmin(user.getId()) > 0;
        Long hotelId = staffRepository.findFirstByUser_IdAndActiveTrue(user.getId())
                .map(StaffAccount::getHotelId).orElse(null);
        return new Actor(user.getId(), hotelId, admin);
    }

    public void requireHotel(Actor actor, Long hotelId) {
        if (!actor.isAdmin() && (actor.getHotelId() == null || !actor.getHotelId().equals(hotelId))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Nhân viên không thuộc khách sạn này.");
        }
    }
}
