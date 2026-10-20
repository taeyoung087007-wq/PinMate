package com.pinmate.pin.service.impl;

import com.pinmate.pin.dao.PinDao;
import com.pinmate.team.dao.TeamDao;
import com.pinmate.auth.dao.UserDao;
import com.pinmate.pin.domain.Pin;
import com.pinmate.team.domain.Team;
import com.pinmate.team.domain.TeamMember;
import com.pinmate.auth.domain.User;
import com.pinmate.pin.dto.CreatePinRequest;
import com.pinmate.pin.dto.PinResponse;
import com.pinmate.pin.dto.RecommendResponse;
import com.pinmate.pin.service.PinService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PinServiceImpl implements PinService {

    private final PinDao pinDao;
    private final TeamDao teamDao;
    private final UserDao userDao;

    @Override
    @Transactional(readOnly = true)
    public List<PinResponse> getPins(Long teamId) {
        List<Pin> pins = pinDao.findPinsByTeamId(teamId);
        return pins.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PinResponse getPin(Long placeId) {
        Pin pin = pinDao.findPinById(placeId);
        if (pin == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다.");
        }
        return toResponse(pin);
    }

    @Override
    @Transactional
    public PinResponse createPin(CreatePinRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "장소 이름을 입력해주세요.");
        }
        if (req.teamId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "팀 ID가 필요합니다.");
        }

        Long teamId = Long.parseLong(req.teamId());
        Long userId = resolveUserId(req.addedBy());

        Pin pin = new Pin();
        pin.setTeamId(teamId);
        pin.setName(req.name().trim());
        pin.setCategory(toDbCategory(req.category()));
        pin.setAddress(req.address());
        pin.setRoadAddress(req.roadAddress() != null ? req.roadAddress() : req.address());
        pin.setLatitude(req.lat() != null ? BigDecimal.valueOf(req.lat()) : BigDecimal.valueOf(37.5665));
        pin.setLongitude(req.lng() != null ? BigDecimal.valueOf(req.lng()) : BigDecimal.valueOf(126.9780));
        pin.setCreatedBy(userId);

        pinDao.insertPin(pin);

        // 등록자를 첫 번째 추천인으로 등록 (한 줄 메모 포함)
        pinDao.insertRecommendation(pin.getPlaceId(), userId, req.memo());

        // '모두 인정' 달성 여부 검사
        checkAndUpdateConsensus(pin.getPlaceId(), teamId);

        return getPin(pin.getPlaceId());
    }

    @Override
    @Transactional
    public RecommendResponse toggleRecommendation(Long placeId, String userIdentifier) {
        Pin pin = pinDao.findPinById(placeId);
        if (pin == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다.");
        }

        Long userId = resolveUserId(userIdentifier);
        boolean previouslyAchieved = pin.getConsensusAchievedAt() != null;

        int existing = pinDao.countRecommendations(placeId, userId);
        if (existing > 0) {
            pinDao.deleteRecommendation(placeId, userId);
        } else {
            pinDao.insertRecommendation(placeId, userId, null);
        }

        boolean currentAchieved = checkAndUpdateConsensus(placeId, pin.getTeamId());
        boolean reachedAllApproved = !previouslyAchieved && currentAchieved;

        return new RecommendResponse(getPin(placeId), reachedAllApproved);
    }

    @Override
    @Transactional
    public PinResponse toggleVisit(Long placeId, String userIdentifier) {
        Pin pin = pinDao.findPinById(placeId);
        if (pin == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다.");
        }

        Long userId = resolveUserId(userIdentifier);
        int existing = pinDao.countVisits(placeId, userId);
        if (existing > 0) {
            pinDao.deleteVisit(placeId, userId);
        } else {
            pinDao.insertVisit(placeId, userId);
        }

        return getPin(placeId);
    }

    private boolean checkAndUpdateConsensus(Long placeId, Long teamId) {
        Team team = teamDao.findTeamById(teamId);
        if (team == null) return false;

        List<TeamMember> members = teamDao.findTeamMembersByTeamId(teamId);
        int recCount = pinDao.countRecommendationsByPlaceId(placeId);

        int target = "all".equalsIgnoreCase(team.getConsensusRule())
            ? Math.max(1, members.size())
            : (team.getConsensusMinCount() != null ? team.getConsensusMinCount() : 2);

        boolean achieved = (recCount >= target);
        pinDao.updateConsensus(placeId, achieved, recCount);
        return achieved;
    }

    private PinResponse toResponse(Pin pin) {
        List<String> recommenders = pinDao.findRecommenderIdsByPlaceId(pin.getPlaceId());
        List<String> visitedBy = pinDao.findVisitorIdsByPlaceId(pin.getPlaceId());

        return new PinResponse(
            String.valueOf(pin.getPlaceId()),
            String.valueOf(pin.getTeamId()),
            pin.getName(),
            toFrontendCategory(pin.getCategory()),
            pin.getAddress(),
            pin.getRoadAddress(),
            pin.getLatitude() != null ? pin.getLatitude().doubleValue() : null,
            pin.getLongitude() != null ? pin.getLongitude().doubleValue() : null,
            pin.getCreatedByLoginId() != null ? pin.getCreatedByLoginId() : String.valueOf(pin.getCreatedBy()),
            recommenders,
            visitedBy,
            pin.getMemo(),
            pin.getConsensusAchievedAt() != null,
            pin.getCreatedAt() != null ? pin.getCreatedAt().toString() : null
        );
    }

    private String toDbCategory(String cat) {
        if (cat == null) return "etc";
        return switch (cat.toLowerCase().trim()) {
            case "food" -> "restaurant";
            case "drink" -> "bar";
            case "sight" -> "attraction";
            case "play" -> "activity";
            default -> cat.toLowerCase().trim();
        };
    }

    private String toFrontendCategory(String cat) {
        if (cat == null) return "etc";
        return switch (cat.toLowerCase().trim()) {
            case "restaurant" -> "food";
            case "bar" -> "drink";
            case "attraction" -> "sight";
            case "activity" -> "play";
            default -> cat.toLowerCase().trim();
        };
    }

    private Long resolveUserId(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return 1L;
        }
        User user = userDao.findByIdOrLoginId(identifier.trim());
        if (user != null) {
            return user.getUserId();
        }
        try {
            return Long.parseLong(identifier.trim());
        } catch (NumberFormatException ignored) {
            return 1L;
        }
    }
}
