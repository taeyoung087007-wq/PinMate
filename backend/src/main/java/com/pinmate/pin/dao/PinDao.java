package com.pinmate.pin.dao;

import com.pinmate.pin.domain.Pin;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface PinDao {

    List<Pin> findPinsByTeamId(@Param("teamId") Long teamId);

    Pin findPinById(@Param("placeId") Long placeId);

    List<String> findRecommenderIdsByPlaceId(@Param("placeId") Long placeId);

    List<String> findVisitorIdsByPlaceId(@Param("placeId") Long placeId);

    void insertPin(Pin pin);

    int countRecommendations(@Param("placeId") Long placeId, @Param("userId") Long userId);

    void insertRecommendation(
        @Param("placeId") Long placeId,
        @Param("userId") Long userId,
        @Param("comment") String comment
    );

    void deleteRecommendation(@Param("placeId") Long placeId, @Param("userId") Long userId);

    int countRecommendationsByPlaceId(@Param("placeId") Long placeId);

    void updateConsensus(
        @Param("placeId") Long placeId,
        @Param("achieved") boolean achieved,
        @Param("memberCount") Integer memberCount
    );

    int countVisits(@Param("placeId") Long placeId, @Param("userId") Long userId);

    void insertVisit(@Param("placeId") Long placeId, @Param("userId") Long userId);

    void deleteVisit(@Param("placeId") Long placeId, @Param("userId") Long userId);

    /** 이름·카테고리 수정 (주소·좌표는 바꾸지 않는다) */
    void updatePin(
        @Param("placeId") Long placeId,
        @Param("name") String name,
        @Param("category") String category
    );

    /** 등록자가 남긴 한 줄 추천평 수정. 해당 추천 행이 없으면 아무 일도 하지 않는다 */
    void updateRecommendationComment(
        @Param("placeId") Long placeId,
        @Param("userId") Long userId,
        @Param("comment") String comment
    );

    /** 핀 삭제. 추천·방문 기록은 FK ON DELETE CASCADE 로 함께 지워진다 */
    void deletePin(@Param("placeId") Long placeId);
}
