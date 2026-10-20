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
}
