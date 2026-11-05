package com.pinmate;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * 실제 PostgreSQL 에 Flyway 마이그레이션 전체를 실행하고 MyBatis mapper XML 을 파싱한다.
 * 단위 테스트는 DAO 를 Mockito 로 대체하므로 매퍼 오타·컬럼 오류가 CI 에서 잡히지 않았었다.
 * 로컬에는 DB 가 없을 수 있어 CI_DB_TEST=true 일 때만 실행한다(CI 는 postgres 서비스를 띄운다).
 */
@SpringBootTest
@ActiveProfiles("ci")
@EnabledIfEnvironmentVariable(named = "CI_DB_TEST", matches = "true")
class PinMateContextLoadTest {

    @Test
    void contextLoadsWithAllMigrationsAndMappers() {
        // 컨텍스트가 뜨면 Flyway V1~V13 실행 + 모든 mapper XML 파싱까지 완료된 것이다
    }
}
