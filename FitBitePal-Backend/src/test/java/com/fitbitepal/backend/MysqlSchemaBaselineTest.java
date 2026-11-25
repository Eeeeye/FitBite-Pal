package com.fitbitepal.backend;

import com.fitbitepal.backend.config.AdminInitializer;
import com.fitbitepal.backend.config.ExerciseInitializer;
import com.fitbitepal.backend.config.FoodItemInitializer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "FITBITE_SCHEMA_DB_URL", matches = "jdbc:mysql:.*")
@ActiveProfiles("prod")
@SpringBootTest(properties = {
        "spring.datasource.url=${FITBITE_SCHEMA_DB_URL}",
        "spring.datasource.username=${FITBITE_TEST_DB_USER}",
        "spring.datasource.password=${FITBITE_TEST_DB_PASSWORD}",
        "spring.mail.host=127.0.0.1", "spring.mail.username=unused", "spring.mail.password=unused",
        "app.security.mail.from=ci@example.test", "app.ai.enabled=false", "app.ai.ark.api-key=",
        "ark.api.enabled=false", "ark.api.key=", "app.pose.use-ai=false",
        "jwt.secret=isolated-schema-validation-fixture-secret",
        "logging.file.name=target/schema-validation.log"
})
class MysqlSchemaBaselineTest {
    @MockitoBean AdminInitializer admins;
    @MockitoBean FoodItemInitializer food;
    @MockitoBean ExerciseInitializer exercises;

    @Autowired Environment environment;
    @Autowired JdbcTemplate jdbc;

    @Test
    void productionMappingsValidateAgainstAnEmptyBaselineWithDailyIndexes() {
        assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
        assertThat(jdbc.queryForObject("select count(*) from users", Long.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from meal_sets", Long.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from exercises", Long.class)).isZero();
        assertIndex("pose_sessions", "idx_pose_draft_age", "session_state", "created_at");
        assertIndex("diet_plans", "idx_diet_user_date_time", "user_id", "plan_date", "meal_time");
        assertIndex("calorie_records", "idx_calorie_user_date", "user_id", "record_date", "id");
    }

    private void assertIndex(String table, String index, String... columns) {
        var actual = jdbc.queryForList("""
                select column_name from information_schema.statistics
                where table_schema = database() and table_name = ? and index_name = ?
                order by seq_in_index
                """, String.class, table, index);
        assertThat(actual).containsExactly(columns);
    }
}
