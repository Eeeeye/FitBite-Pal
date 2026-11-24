package com.fitbitepal.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitbitepal.backend.config.ExerciseInitializer;
import com.fitbitepal.backend.config.FoodItemInitializer;
import com.fitbitepal.backend.model.PoseSession;
import com.fitbitepal.backend.dto.PoseSaveSessionRequest;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.PoseSessionRepository;
import com.fitbitepal.backend.repository.UserRepository;
import com.fitbitepal.backend.service.ArkAIService;
import com.fitbitepal.backend.service.PoseSessionService;
import com.fitbitepal.backend.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ActiveProfiles("test")
@SpringBootTest(properties = {
        "spring.datasource.url=${FITBITE_TEST_DB_URL:jdbc:h2:mem:ownership;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=VALUE,DAY}",
        "spring.datasource.username=${FITBITE_TEST_DB_USER:sa}",
        "spring.datasource.password=${FITBITE_TEST_DB_PASSWORD:}",
        "spring.datasource.driver-class-name=${FITBITE_TEST_DB_DRIVER:org.h2.Driver}",
        "spring.jpa.properties.hibernate.dialect=${FITBITE_TEST_DB_DIALECT:org.hibernate.dialect.H2Dialect}",
        "spring.jpa.show-sql=false", "logging.level.org.hibernate=WARN", "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.ai.enabled=true", "app.pose.enabled=true", "app.pose.use-ai=true", "app.pose.demo-feedback=false"
})
@AutoConfigureMockMvc
class PersonalDataFlowTest {
    @MockBean FoodItemInitializer foods;
    @MockBean ExerciseInitializer exercises;
    @MockBean ArkAIService ark;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PoseSessionRepository poses;
    @Autowired PoseSessionService sessions;
    @Autowired JwtUtil jwt;

    private User owner;
    private String token;
    private String other;

    @BeforeEach
    void registerUsers() {
        owner = user();
        token = token(owner);
        other = token(user());
    }

    private User user() {
        User user = new User();
        user.setUsername(UUID.randomUUID().toString());
        user.setEmail(user.getUsername() + "@example.test");
        user.setPassword("test-fixture");
        return users.saveAndFlush(user);
    }

    private String token(User user) {
        return "Bearer " + jwt.generateToken(user.getId(), user.getUsername());
    }

    @Test
    void planStatisticsAndDietRecordRespectTheAccountBoundary() throws Exception {
        for (String url : new String[]{"/plans/diet/" + owner.getId(), "/data/weight?userId=" + owner.getId(),
                "/records/diet/" + owner.getId()}) {
            mvc.perform(get(url).header("Authorization", token)).andExpect(status().isOk());
            mvc.perform(get(url).header("Authorization", other)).andExpect(status().isForbidden());
        }
        String result = mvc.perform(post("/records/diet/" + owner.getId()).header("Authorization", token)
                .contentType(APPLICATION_JSON).content("{\"foodName\":\"apple\",\"mealType\":\"lunch\",\"calories\":50}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(result).at("/data/id").asLong();
        mvc.perform(delete("/records/diet/" + id).header("Authorization", other)).andExpect(status().isNotFound());
        mvc.perform(delete("/records/diet/" + id).header("Authorization", token)).andExpect(status().isOk());
        mvc.perform(post("/ai/advice").header("Authorization", other).contentType(APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("userId", owner.getId(), "question", "hello"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void dailyCalorieWritesReuseTheExistingRow() throws Exception {
        Long firstId = null;
        for (int intake : new int[]{50, 70}) {
            String body = mvc.perform(post("/data/calories").header("Authorization", token)
                    .contentType(APPLICATION_JSON).content(json.writeValueAsBytes(Map.of("userId", owner.getId(), "intake", intake))))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            long id = json.readTree(body).at("/data/id").asLong();
            if (firstId != null) assertThat(id).isEqualTo(firstId);
            firstId = id;
        }
        mvc.perform(get("/data/calories").param("userId", owner.getId().toString()).header("Authorization", token))
                .andExpect(jsonPath("$.data.length()").value(1)).andExpect(jsonPath("$.data[0].intake").value(70));
    }

    @Test
    void poseOwnerCanFinishAndSaveOnceAndProviderFailuresRemainVisible() throws Exception {
        String body = mvc.perform(post("/pose/session/start").header("Authorization", token).contentType(APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("userId", owner.getId(), "exerciseName", "squat"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(body).at("/data/sessionId").asText();
        byte[] frame = json.writeValueAsBytes(Map.of("sessionId", id, "imageBase64", "fixture", "frameNumber", 1));
        byte[] session = json.writeValueAsBytes(Map.of("sessionId", id));
        byte[] save = json.writeValueAsBytes(Map.of("sessionId", id, "userId", owner.getId(), "reps", 3));

        mvc.perform(get("/pose/sessions/" + owner.getId()).header("Authorization", token))
                .andExpect(jsonPath("$.data.length()").value(0));
        mvc.perform(post("/pose/frame").header("Authorization", other).contentType(APPLICATION_JSON).content(frame))
                .andExpect(status().isNotFound());
        mvc.perform(post("/pose/frame").header("Authorization", token).contentType(APPLICATION_JSON).content(frame))
                .andExpect(status().isServiceUnavailable());
        when(ark.analyzePose(anyString(), anyString(), anyString())).thenReturn("{\"score\":82,\"issues\":[],\"suggestions\":[]}");
        mvc.perform(post("/pose/frame").header("Authorization", token).contentType(APPLICATION_JSON).content(frame))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.score").value(82))
                .andExpect(jsonPath("$.data.demo").value(false));
        mvc.perform(post("/pose/session/end").header("Authorization", token).contentType(APPLICATION_JSON).content(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("completed"));
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/pose/session/save").header("Authorization", token).contentType(APPLICATION_JSON).content(save))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/pose/history/" + id).header("Authorization", other)).andExpect(status().isNotFound());
        mvc.perform(get("/pose/history/" + id).header("Authorization", token)).andExpect(jsonPath("$.data.reps").value(3));
        mvc.perform(get("/pose/sessions/" + owner.getId()).header("Authorization", token))
                .andExpect(jsonPath("$.data.length()").value(1));
        mvc.perform(delete("/pose/session/" + id).header("Authorization", other)).andExpect(status().isNotFound());
        mvc.perform(delete("/pose/session/" + id).header("Authorization", token)).andExpect(status().isOk());
    }

    @Test
    void recognitionAndAdviceReportUnavailableAndOnlyLabelSuppliedContextAsPersonalized() throws Exception {
        var image = post("/ai/food/recognize").header("Authorization", token).contentType(APPLICATION_JSON);
        mvc.perform(image.content("{}")).andExpect(status().isBadRequest());
        mvc.perform(image.content("{\"imageBase64\":\"test\"}")).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false)).andExpect(jsonPath("$.data").doesNotExist());
        var advice = post("/ai/advice").header("Authorization", token).contentType(APPLICATION_JSON);
        mvc.perform(advice.content("{\"question\":\"hello\"}")).andExpect(status().isServiceUnavailable());
        when(ark.isHealthy()).thenReturn(true);
        when(ark.getAdvice("general", "hello", null, "zh")).thenReturn("provider response");
        mvc.perform(advice.content(json.writeValueAsBytes(Map.of("userId", owner.getId(), "question", "hello"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.personalized").value(false))
                .andExpect(jsonPath("$.data.advice").value("provider response")).andExpect(jsonPath("$.data.confidence").doesNotExist());
        when(ark.getAdvice("general", "hello", "training context", "zh")).thenReturn("context-aware response");
        mvc.perform(advice.content("{\"question\":\"hello\",\"context\":\"training context\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.personalized").value(true));
        mvc.perform(post("/ai/chat").header("Authorization", token).contentType(APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/ai/chat").header("Authorization", token).contentType(APPLICATION_JSON).content("{\"message\":\"hello\"}"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void overlappingSaveRequestsCommitOneSession() throws Exception {
        String id = UUID.randomUUID().toString();
        poses.saveAndFlush(PoseSession.builder().sessionId(id).userId(owner.getId()).exerciseName("squat")
                .duration(15).state(PoseSession.State.COMPLETED).build());
        var request = PoseSaveSessionRequest.builder().sessionId(id).userId(owner.getId()).reps(3).build();
        var start = new CountDownLatch(1);
        Callable<Void> save = () -> {
            start.await();
            sessions.save(request, owner);
            return null;
        };
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(save);
            var second = executor.submit(save);
            start.countDown();
            first.get(10, TimeUnit.SECONDS);
            second.get(10, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }
        var history = sessions.list(owner.getId());
        assertThat(history).hasSize(1);
        assertThat(history.get(0).getDuration()).isEqualTo(15);
        assertThat(history.get(0).getReps()).isEqualTo(3);
    }

    @Test
    void cleanupKeepsPreMigrationHistoryAndRemovesOnlyOldDrafts() {
        LocalDateTime old = LocalDateTime.now().minusDays(15);
        PoseSession legacy = poses.saveAndFlush(PoseSession.builder().sessionId(UUID.randomUUID().toString())
                .userId(owner.getId()).exerciseName("squat").createdAt(old).build());
        PoseSession draft = poses.saveAndFlush(PoseSession.builder().sessionId(UUID.randomUUID().toString())
                .userId(owner.getId()).exerciseName("squat").state(PoseSession.State.ACTIVE).createdAt(old).build());
        sessions.removeExpiredDrafts();
        assertThat(sessions.list(owner.getId())).hasSize(1);
        assertThat(poses.existsById(legacy.getId())).isTrue();
        assertThat(poses.existsById(draft.getId())).isFalse();
    }
}
