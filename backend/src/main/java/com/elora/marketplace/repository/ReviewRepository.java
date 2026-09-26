package com.elora.marketplace.repository;

import com.elora.marketplace.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Map;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByReviewedUserIdOrderByCreatedAtDesc(Long reviewedUserId);
    List<Review> findByReviewedUserIdAndServiceOrderIsNotNullOrderByCreatedAtDesc(Long reviewedUserId);
    @Query("select avg(r.rating) from Review r where r.reviewedUser.id = :userId")
    Double averageForUser(@Param("userId") Long userId);
    @Query("select count(r) from Review r where r.reviewedUser.id = :userId")
    long countForUser(@Param("userId") Long userId);
    @Query("select avg(r.rating) from Review r where r.reviewedUser.id = :userId and r.serviceOrder is not null")
    Double averageServiceRatingForUser(@Param("userId") Long userId);
    @Query("select count(r) from Review r where r.reviewedUser.id = :userId and r.serviceOrder is not null")
    long countServiceReviewsForUser(@Param("userId") Long userId);
    @Query("select r.rating, count(r) from Review r where r.reviewedUser.id = :userId group by r.rating")
    List<Object[]> distributionForUser(@Param("userId") Long userId);
    boolean existsByReviewerIdAndProductOrderIdAndReviewedUserId(Long reviewerId, Long orderId, Long reviewedUserId);
    boolean existsByReviewerIdAndServiceOrderId(Long reviewerId, Long serviceOrderId);
    @Query("select r.reviewedUser.id, avg(r.rating), count(r) from Review r where r.reviewedUser.id in :userIds and r.serviceOrder is not null group by r.reviewedUser.id")
    List<Object[]> statsForUsers(@Param("userIds") List<Long> userIds);
}
