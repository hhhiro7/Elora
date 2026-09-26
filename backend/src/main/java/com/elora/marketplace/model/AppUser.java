package com.elora.marketplace.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity @Data @Table(name = "users")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String name;
    @JsonIgnore
    @Column(nullable = false, unique = true) private String email;
    @JsonIgnore
    @Column(nullable = false, unique = true) private String cpf;
    @JsonIgnore
    @Column(nullable = false) private String password;
    private String role = "USER";
    private LocalDateTime createdAt = LocalDateTime.now();
    @Column(length = 500) private String avatarUrl;
    @Column(length = 500) private String bio;
    private String city;
    @JsonIgnore
    private String phone;
}
