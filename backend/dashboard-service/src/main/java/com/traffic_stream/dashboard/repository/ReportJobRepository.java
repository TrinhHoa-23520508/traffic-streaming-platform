package com.traffic_stream.dashboard.repository;

import com.traffic_stream.dashboard.entity.ReportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ReportJobRepository extends JpaRepository<ReportJob, Long> {

    @Query("SELECT r FROM ReportJob r WHERE r.status = 'PENDING' AND r.executeAt <= :now")
    List<ReportJob> findExecutableJobs(@Param("now") Instant now);
}
