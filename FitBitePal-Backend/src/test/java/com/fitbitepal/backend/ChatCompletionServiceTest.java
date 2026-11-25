package com.fitbitepal.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitbitepal.backend.service.ChatCompletionService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;

class ChatCompletionServiceTest {
    private static final String ARK = "https://provider.example.test";
    private static final String OPENAI_COMPLETIONS = "https://api.openai.com/v1/chat/completions";
    private final ObjectMapper mapper = new ObjectMapper();
    private final MockEnvironment config = new MockEnvironment()
            .withProperty("ark.api.base-url", ARK)
            .withProperty("ark.api.model", "ark-model")
            .withProperty("ark.api.key", "fixture-ark")
            .withProperty("app.ai.openai.api-key", "fixture-openai");
    private MockRestServiceServer server;

    private ChatCompletionService client() {
        var client = new ChatCompletionService(mapper, config);
        RestTemplate transport = (RestTemplate) ReflectionTestUtils.getField(client, "restTemplate");
        server = MockRestServiceServer.bindTo(transport).build();
        return client;
    }

    private String completion(String content) throws Exception {
        return mapper.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", content)))));
    }

    private void arkResponse(String content) throws Exception {
        server.expect(requestTo(ARK + "/chat/completions"))
                .andExpect(header("Authorization", "Bearer fixture-ark"))
                .andExpect(jsonPath("$.model").value("ark-model"))
                .andExpect(jsonPath("$.store").doesNotExist())
                .andRespond(withSuccess(completion(content), MediaType.APPLICATION_JSON));
    }

    @Test
    void foodWithoutNutritionCannotProduceZeroCalorieTotals() throws Exception {
        var ai = client();
        arkResponse("{\"foods\":[{\"name\":\"rice\"}]}");
        assertThat(ai.recognizeFood("fixture", "en")).isNull();
        server.verify();
    }

    @Test
    void totalsCanBeDerivedFromCompleteIngredientEstimates() throws Exception {
        var ai = client();
        arkResponse("{\"foods\":[{\"name\":\"rice\",\"nutrition\":{\"calories\":110,\"protein\":3,\"carbs\":23,\"fat\":0}}]}");
        var result = ai.recognizeFood("fixture", "en");
        assertThat(result.getTotalNutrition().getCalories()).isEqualTo(110);
        assertThat(result.getTotalNutrition().getFat()).isZero();
        server.verify();
    }

    @Test
    void openAiUsesTheOfficialEndpointAndOwnCredentialForText() throws Exception {
        config.setProperty("app.ai.provider", "openai");
        config.setProperty("ark.api.enabled", "false");
        var ai = client();
        server.expect(requestTo(OPENAI_COMPLETIONS))
                .andExpect(header("Authorization", "Bearer fixture-openai"))
                .andExpect(jsonPath("$.model").value("gpt-4.1-mini"))
                .andExpect(jsonPath("$.messages[0].content[0].text").value("hello"))
                .andExpect(jsonPath("$.store").value(false))
                .andExpect(jsonPath("$.max_completion_tokens").value(1200))
                .andRespond(withSuccess(completion("world"), MediaType.APPLICATION_JSON));
        assertThat(ai.chat("hello", null, "en")).isEqualTo("world");
        server.verify();
    }

    @Test
    void openAiUsesVisionContentAndTheConfiguredModelForFood() throws Exception {
        config.setProperty("app.ai.provider", "openai");
        config.setProperty("app.ai.openai.model", "vision-model");
        var ai = client();
        server.expect(requestTo(OPENAI_COMPLETIONS))
                .andExpect(header("Authorization", "Bearer fixture-openai"))
                .andExpect(jsonPath("$.model").value("vision-model"))
                .andExpect(jsonPath("$.messages[0].content[1].type").value("image_url"))
                .andExpect(jsonPath("$.messages[0].content[1].image_url.url").value("data:image/png;base64,Zg=="))
                .andRespond(withSuccess(completion("{\"foods\":[{\"name\":\"rice\",\"nutrition\":{\"calories\":110,\"protein\":3,\"carbs\":23,\"fat\":0}}]}"), MediaType.APPLICATION_JSON));
        assertThat(ai.recognizeFood("data:image/png;base64,Zg==", "en").getFoods().get(0).getName()).isEqualTo("rice");
        server.verify();
    }

    @Test
    void missingSelectedKeyNeverUsesTheOtherProvidersKey() {
        config.setProperty("app.ai.provider", "openai");
        config.setProperty("app.ai.openai.api-key", "");
        var ai = client();
        assertThat(ai.isHealthy()).isFalse();
        assertThat(ai.testConnection()).isFalse();
        assertThat(ai.chat("hello", null, "en")).isNull();
        server.verify();
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void logsOnlyTheCauseTypeForTransportFailures(CapturedOutput output) {
        config.setProperty("app.ai.provider", "openai");
        var ai = client();
        server.expect(requestTo(OPENAI_COMPLETIONS)).andRespond(withException(
                new java.net.SocketTimeoutException("private network diagnostics")));
        assertThat(ai.chat("private question", null, "en")).isNull();
        assertThat(output.getAll()).contains("openai transport failed (SocketTimeoutException)")
                .doesNotContain("private network diagnostics", "private question", "fixture-openai");
        server.verify();
    }

    @Test
    void unknownProviderFailsAtStartup() {
        config.setProperty("app.ai.provider", "unsupported");
        assertThatIllegalArgumentException().isThrownBy(this::client);
    }
}
