package com.filora.dms.repository;

import com.filora.dms.entity.UserEntity;
import com.filora.dms.entity.User;
import com.filora.dms.entity.CompanyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserEntityRepository extends JpaRepository<UserEntity, Integer> {
    List<UserEntity> findAllByUser(User user);
    List<UserEntity> findAllByCompany(CompanyEntity company);
    Optional<UserEntity> findByUserAndCompany(User user, CompanyEntity company);
    boolean existsByUserAndCompany(User user, CompanyEntity company);
    void deleteByUser(User user);
}
