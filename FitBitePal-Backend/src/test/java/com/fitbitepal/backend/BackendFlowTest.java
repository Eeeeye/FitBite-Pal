package com.fitbitepal.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitbitepal.backend.config.ExerciseInitializer;
import com.fitbitepal.backend.config.FoodItemInitializer;
import com.fitbitepal.backend.dto.BatchCompletionRequest;
import com.fitbitepal.backend.dto.CompletionItemRequest;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.UserRepository;
import com.fitbitepal.backend.service.CompletionService;
import com.fitbitepal.backend.service.EmailService;
import com.fitbitepal.backend.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=${FITBITE_TEST_DB_URL:jdbc:h2:mem:flows;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=VALUE,DAY}",
        "spring.datasource.username=${FITBITE_TEST_DB_USER:sa}",
        "spring.datasource.password=${FITBITE_TEST_DB_PASSWORD:}",
        "spring.datasource.driver-class-name=${FITBITE_TEST_DB_DRIVER:org.h2.Driver}",
        "spring.jpa.properties.hibernate.dialect=${FITBITE_TEST_DB_DIALECT:org.hibernate.dialect.H2Dialect}",
        "spring.jpa.show-sql=false", "logging.level.org.hibernate=WARN", "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class BackendFlowTest {
    @TestConfiguration
    static class LocalCache {
        @Bean @Primary
        CacheManager testCaches() { return new ConcurrentMapCacheManager(); }
    }

    @MockBean FoodItemInitializer foods;
    @MockBean ExerciseInitializer exercises;
    @MockBean EmailService email;
    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired CompletionService completions;
    @Autowired JwtUtil jwt;
    @Autowired PasswordEncoder encoder;
    private User user;
    private String bearer;
    private final LocalDate date = LocalDate.of(2026, 11, 25);

    @BeforeEach
    void createUser() {
        user = new User();
        user.setUsername(UUID.randomUUID().toString());
        user.setEmail(user.getUsername() + "@example.test");
        user.setPhone("12345");
        user.setPassword(encoder.encode("initial-password"));
        users.saveAndFlush(user);
        bearer = "Bearer " + jwt.generateToken(user.getId(), user.getUsername());
    }

    @Test
    void profileUpdateMergesOnlyPresentFieldsWithCurrentDatabaseState() throws Exception {
        String path = "/users/" + user.getId();
        http.perform(get(path).header("Authorization", bearer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.password").doesNotExist());
        user.setWeight(81.0);
        users.saveAndFlush(user);
        http.perform(put(path + "/basic-info").header("Authorization", bearer)
                .contentType(APPLICATION_JSON).content("{\"username\":\"updated\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.weight").value(81))
                .andExpect(jsonPath("$.data.phone").value("12345"))
                .andExpect(jsonPath("$.data.password").doesNotExist());
        http.perform(put(path + "/basic-info").header("Authorization", bearer)
                .contentType(APPLICATION_JSON).content("{\"phone\":null}")).andExpect(status().isOk());
        http.perform(get(path + "/profile").header("Authorization", bearer))
                .andExpect(jsonPath("$.data.username").value("updated"));
        User current = users.findById(user.getId()).orElseThrow();
        assertThat(current.getPhone()).isNull();
        assertThat(current.getPassword()).isEqualTo(user.getPassword());
    }

    @Test
    void adminConsoleRequiresTheDatabaseAdminRole() throws Exception {
        http.perform(get("/admin/")).andExpect(status().isFound()).andExpect(redirectedUrl("/admin/index.html"));
        http.perform(get("/admin/index.html")).andExpect(status().isOk());
        http.perform(get("/admin/dashboard")).andExpect(status().isUnauthorized());
        http.perform(get("/admin/dashboard").header("Authorization", bearer)).andExpect(status().isForbidden());
        user.setRole("ADMIN");
        users.saveAndFlush(user);
        http.perform(get("/admin/dashboard").header("Authorization", bearer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.userCount").isNumber());
    }

    @Test
    void ownerScopeIsEnforcedForProfileAndCompletionRequests() throws Exception {
        long otherId = user.getId() + 10000;
        http.perform(get("/users/" + otherId).header("Authorization", bearer)).andExpect(status().isForbidden());
        http.perform(get("/completion/records").param("userId", String.valueOf(otherId))
                .param("itemType", "exercise").header("Authorization", bearer)).andExpect(status().isForbidden());
    }

    @Test
    void resetChangesPasswordOnlyOnceAfterCodeConsumption() throws Exception {
        String code = "123456";
        when(email.verifyCode(user.getEmail(), code)).thenReturn(true);
        when(email.consumeCode(user.getEmail(), code)).thenReturn(true, false);
        http.perform(post("/auth/verify-code").contentType(APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("email", user.getEmail(), "code", code))))
                .andExpect(status().isOk());
        byte[] request = json.writeValueAsBytes(Map.of("email", user.getEmail(), "code", code,
                "newPassword", "changed-password"));
        http.perform(post("/auth/reset-password").contentType(APPLICATION_JSON).content(request))
                .andExpect(status().isOk());
        String hash = users.findById(user.getId()).orElseThrow().getPassword();
        assertThat(encoder.matches("changed-password", hash)).isTrue();
        http.perform(post("/auth/reset-password").contentType(APPLICATION_JSON).content(request))
                .andExpect(status().isBadRequest());
        assertThat(users.findById(user.getId()).orElseThrow().getPassword()).isEqualTo(hash);
    }

    @Test
    void singleBatchAndHistoryShareTheSameRecordAndLegacyResponseShapes() throws Exception {
        Map<String, Object> key = Map.of("userId", user.getId(), "date", date.toString(), "itemType", "meal");
        var single = new java.util.HashMap<>(key);
        single.put("itemIndex", 0);
        single.put("completed", true);
        String response = http.perform(post("/completion/save").header("Authorization", bearer)
                .contentType(APPLICATION_JSON).content(json.writeValueAsBytes(single)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.calories").value(0))
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(response).at("/data/id").asLong();
        var batch = new java.util.HashMap<>(key);
        batch.put("items", List.of(Map.of("itemIndex", 0, "completed", true),
                Map.of("itemIndex", 0, "completed", false)));
        http.perform(post("/completion/batch-save").header("Authorization", bearer)
                .contentType(APPLICATION_JSON).content(json.writeValueAsBytes(batch)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        http.perform(get("/completion/records").header("Authorization", bearer)
                .param("userId", user.getId().toString()).param("itemType", "meal"))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(id))
                .andExpect(jsonPath("$.data[0].completed").value(false));
    }

    @Test
    void invalidBatchReturns400BeforeWritingAnyRow() throws Exception {
        var batch = Map.of("userId", user.getId(), "date", date, "itemType", "exercise",
                "items", List.of(Map.of("itemIndex", 0, "completed", true), Map.of("itemIndex", 1)));
        http.perform(post("/completion/batch-save").header("Authorization", bearer)
                .contentType(APPLICATION_JSON).content(json.writeValueAsBytes(batch)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false));
        assertThat(completions.list(user.getId(), date, "exercise")).isEmpty();
    }

    @Test
    void databaseFailureOnSecondItemRollsBackTheFirst() {
        CompletionItemRequest invalid = item(1);
        invalid.setItemName("x".repeat(101));
        var batch = new BatchCompletionRequest(user.getId(), date, "exercise", List.of(item(0), invalid));
        assertThatThrownBy(() -> completions.saveBatch(batch)).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(completions.list(user.getId(), date, "exercise")).isEmpty();
    }

    @Test
    void concurrentFirstSubmissionsReturnTheSameId() throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        var ready = new CountDownLatch(2);
        java.util.concurrent.Callable<Long> submit = () -> {
            ready.countDown();
            if (!start.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("start timed out");
            return completions.save(user.getId(), date, "exercise", item(0)).getId();
        };
        try {
            var first = pool.submit(submit);
            var second = pool.submit(submit);
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo(second.get(10, TimeUnit.SECONDS));
            assertThat(completions.list(user.getId(), date, "exercise")).hasSize(1);
        } finally {
            pool.shutdownNow();
        }
    }

    private CompletionItemRequest item(int index) {
        CompletionItemRequest item = new CompletionItemRequest();
        item.setItemIndex(index);
        item.setCompleted(true);
        return item;
    }
}
