package com.fitbitepal.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitbitepal.backend.config.ExerciseInitializer;
import com.fitbitepal.backend.config.FoodItemInitializer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "FITBITE_TEST_INBOX_PORT", matches = "[0-9]+")
@AutoConfigureTestRestTemplate
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:mailflow;MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=VALUE,DAY",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.data.redis.host=127.0.0.1", "spring.data.redis.port=${FITBITE_TEST_REDIS_PORT:6379}",
        "spring.mail.host=127.0.0.1", "spring.jpa.hibernate.ddl-auto=create-drop", "logging.level.org.hibernate=WARN",
        "spring.jpa.show-sql=false", "server.address=127.0.0.1"
})
class ResetMailFlowTest {
    @MockitoBean FoodItemInitializer foods;
    @MockitoBean ExerciseInitializer exercises;
    @LocalServerPort int port;
    @Autowired TestRestTemplate http;
    @Autowired Environment environment;

    @Test
    void registeredUserReceivesAndRedeemsCodeFromRealSmtpInbox() {
        assertThat(environment.acceptsProfiles(Profiles.of("localmail"))).isTrue();
        String username = "mail" + UUID.randomUUID().toString().replace("-", "");
        String address = username + "@example.test";
        assertThat(post("register", Map.of("username", username, "email", address, "password", "first-password"))
                .path("success").asBoolean()).isTrue();

        JsonNode response = post("send-reset-code", Map.of("email", address));
        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(post("send-reset-code", Map.of("email", username + "-unknown@example.test"))).isEqualTo(response);
        String inbox = "http://127.0.0.1:" + System.getenv("FITBITE_TEST_INBOX_PORT") + "/api/v1";
        JsonNode messages = http.getForObject(inbox + "/messages?limit=100", JsonNode.class).path("messages");
        String messageId = null;
        for (JsonNode message : messages) {
            if (address.equals(message.path("To").path(0).path("Address").asText())) {
                messageId = message.path("ID").asText();
                break;
            }
        }
        assertThat(messageId).as("SMTP envelope delivered to the registered mailbox").isNotBlank();
        JsonNode message = http.getForObject(inbox + "/message/" + messageId, JsonNode.class);
        var codeInBody = Pattern.compile("\\b[0-9]{6}\\b").matcher(message.path("Text").asText());
        assertThat(codeInBody.find()).isTrue();
        String code = codeInBody.group();
        assertThat(post("verify-code", Map.of("email", address, "code", code)).path("success").asBoolean()).isTrue();
        assertThat(post("reset-password", Map.of("email", address, "code", code, "newPassword", "second-password"))
                .path("success").asBoolean()).isTrue();
        assertThat(post("login", Map.of("usernameOrEmail", address, "password", "second-password"))
                .at("/data/token").asText()).isNotBlank();
    }

    private JsonNode post(String endpoint, Map<String, String> body) {
        return http.postForObject("http://127.0.0.1:" + port + "/api/auth/" + endpoint, body, JsonNode.class);
    }
}
