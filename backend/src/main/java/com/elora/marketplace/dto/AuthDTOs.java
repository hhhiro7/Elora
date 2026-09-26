package com.elora.marketplace.dto;
public class AuthDTOs {
    public record LoginReq(String email, String password) {}
    public record RegisterReq(String name, String email, String cpf, String password, String city, String phone) {}
    public record TokenRes(String token, String name) {}
}
