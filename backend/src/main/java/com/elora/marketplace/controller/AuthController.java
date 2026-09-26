package com.elora.marketplace.controller;
import com.elora.marketplace.dto.AuthDTOs.*;
import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.repository.UserRepository;
import com.elora.marketplace.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.Map;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterReq req) {
        if (req.name() == null || req.name().trim().length() < 2 || req.email() == null || !req.email().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
                || req.password() == null || req.password().length() < 8 || req.cpf() == null || !validCpf(req.cpf()))
            return ResponseEntity.badRequest().body(Map.of("message", "Confira nome, e-mail, CPF e senha (mínimo 8 caracteres)."));
        String email = req.email().trim().toLowerCase();
        String cpf = req.cpf().replaceAll("\\D", "");
        if(userRepo.existsByEmailIgnoreCase(email) || userRepo.existsByCpf(cpf))
            return ResponseEntity.badRequest().body(Map.of("message", "E-mail ou CPF já cadastrado."));
        AppUser user = new AppUser();
        user.setName(req.name().trim()); user.setEmail(email); user.setCpf(cpf);
        user.setCity(req.city() == null || req.city().isBlank() ? null : req.city().trim());
        user.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone().trim());
        user.setPassword(encoder.encode(req.password()));
        userRepo.save(user);
        return ResponseEntity.status(201).body(Map.of("message", "Usuário cadastrado com sucesso!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginReq req) {
        var userOpt = req.email() == null ? java.util.Optional.<AppUser>empty() : userRepo.findFirstByEmailIgnoreCase(req.email().trim());
        if(userOpt.isPresent() && encoder.matches(req.password(), userOpt.get().getPassword())) {
            String token = jwtUtil.generateToken(req.email());
            return ResponseEntity.ok(new TokenRes(token, userOpt.get().getName()));
        }
        return ResponseEntity.status(401).body("Credenciais inválidas");
    }

    private boolean validCpf(String value) {
        String cpf = value.replaceAll("\\D", "");
        if (!cpf.matches("\\d{11}") || cpf.chars().distinct().count() == 1) return false;
        int sum = 0;
        for (int i = 0; i < 9; i++) sum += (cpf.charAt(i) - '0') * (10 - i);
        int digit = 11 - sum % 11; if (digit >= 10) digit = 0;
        if (digit != cpf.charAt(9) - '0') return false;
        sum = 0;
        for (int i = 0; i < 10; i++) sum += (cpf.charAt(i) - '0') * (11 - i);
        digit = 11 - sum % 11; if (digit >= 10) digit = 0;
        return digit == cpf.charAt(10) - '0';
    }
}
