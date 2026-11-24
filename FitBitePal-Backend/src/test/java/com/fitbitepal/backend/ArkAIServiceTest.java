package com.fitbitepal.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitbitepal.backend.service.ArkAIService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ArkAIServiceTest {
    private static final String BASE_URL = "https://provider.example.test";
    private final ObjectMapper mapper = new ObjectMapper();
    private final ArkAIService ark = new ArkAIService(mapper, 5000);
    private MockRestServiceServer server;

    @BeforeEach
    void configureProvider() {
        ReflectionTestUtils.setField(ark, "baseUrl", BASE_URL);
        ReflectionTestUtils.setField(ark, "enabled", true);
        ReflectionTestUtils.setField(ark, "apiKey", "fixture");
        ReflectionTestUtils.setField(ark, "model", "test-model");
        RestTemplate client = (RestTemplate) ReflectionTestUtils.getField(ark, "restTemplate");
        server = MockRestServiceServer.bindTo(client).build();
    }

    private void respond(String content) throws Exception {
        String response = mapper.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", content)))));
        server.expect(requestTo(BASE_URL + "/chat/completions")).andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
    }

    @Test
    void foodWithoutNutritionCannotProduceZeroCalorieTotals() throws Exception {
        respond("{\"foods\":[{\"name\":\"rice\"}]}");
        assertThat(ark.recognizeFood("fixture", "en")).isNull();
        server.verify();
    }

    @Test
    void totalsCanBeDerivedFromCompleteIngredientEstimates() throws Exception {
        respond("{\"foods\":[{\"name\":\"rice\",\"nutrition\":{\"calories\":110,\"protein\":3,\"carbs\":23,\"fat\":0}}]}");
        var result = ark.recognizeFood("fixture", "en");
        assertThat(result.getTotalNutrition().getCalories()).isEqualTo(110);
        assertThat(result.getTotalNutrition().getFat()).isZero();
        server.verify();
    }
}
