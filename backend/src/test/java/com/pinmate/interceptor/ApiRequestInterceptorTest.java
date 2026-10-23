package com.pinmate.interceptor;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/**
 * 상태를 바꾸는 요청(POST·PATCH·DELETE)의 CSRF 방어 규칙.
 * 헤더(X-Requested-With)와 JSON 본문이 둘 다 있어야 통과한다.
 */
class ApiRequestInterceptorTest {

    private final ApiRequestInterceptor interceptor = new ApiRequestInterceptor();

    private MockHttpServletRequest request(String method, String contentType, String requestedWith) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, "/api/pins");
        if (contentType != null) {
            request.setContentType(contentType);
        }
        if (requestedWith != null) {
            request.addHeader("X-Requested-With", requestedWith);
        }
        return request;
    }

    @Test
    @DisplayName("Ajax 헤더 + JSON 본문이면 통과")
    void allowsAjaxJsonRequest() throws Exception {
        boolean allowed = interceptor.preHandle(
                request("POST", "application/json;charset=UTF-8", "XMLHttpRequest"),
                new MockHttpServletResponse(), new Object());

        assertThat(allowed).isTrue();
    }

    @Test
    @DisplayName("GET 은 검사하지 않는다")
    void allowsGet() throws Exception {
        boolean allowed = interceptor.preHandle(
                request("GET", null, null), new MockHttpServletResponse(), new Object());

        assertThat(allowed).isTrue();
    }

    @Test
    @DisplayName("헤더가 있어도 JSON 이 아니면 403")
    void rejectsNonJsonBody() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(
                request("POST", "application/x-www-form-urlencoded", "XMLHttpRequest"), response, new Object());

        assertThat(allowed).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("JSON 이어도 헤더가 없으면 403")
    void rejectsWithoutAjaxHeader() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(
                request("PATCH", "application/json", null), response, new Object());

        assertThat(allowed).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("거절 응답도 다른 API 와 같은 {code, message, data} 형식이다")
    void rejectionBodyUsesCommonFormat() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        interceptor.preHandle(request("DELETE", null, null), response, new Object());

        assertThat(response.getContentAsString())
                .contains("\"code\":\"99\"")
                .contains("\"message\":\"허용되지 않는 요청입니다.\"")
                .contains("\"data\":null");
    }
}
