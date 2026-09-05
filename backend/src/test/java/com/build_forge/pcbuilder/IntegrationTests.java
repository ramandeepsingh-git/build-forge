package com.build_forge.pcbuilder;

import com.build_forge.pcbuilder.dto.AuthRequest;
import com.build_forge.pcbuilder.dto.CreateBuildRequest;
import com.build_forge.pcbuilder.dto.UserRequest;
import com.build_forge.pcbuilder.entity.Components;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class IntegrationTests {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    private static final String TEST_USERNAME_A = "user_a_" + System.currentTimeMillis();
    private static final String TEST_EMAIL_A = "usera_" + System.currentTimeMillis() + "@buildforge.test";

    private static final String TEST_USERNAME_B = "user_b_" + System.currentTimeMillis();
    private static final String TEST_EMAIL_B = "userb_" + System.currentTimeMillis() + "@buildforge.test";

    private static String tokenA;
    private static String tokenB;
    private static Long userIdA;
    private static Long buildIdA;

    @BeforeEach
    void setUp() {
        jakarta.servlet.Filter springSecurityFilterChain = webApplicationContext.getBean("springSecurityFilterChain", jakarta.servlet.Filter.class);
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .addFilters(springSecurityFilterChain)
                .build();
    }

    @Test
    @Order(1)
    void testSignupUserA() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setUsername(TEST_USERNAME_A);
        request.setEmail(TEST_EMAIL_A);
        request.setPassword("securePassword123");

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("Signup Successful")));
    }

    @Test
    @Order(2)
    void testDuplicateUsernameRejected() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setUsername(TEST_USERNAME_A);
        request.setEmail("different_" + System.currentTimeMillis() + "@test.com");
        request.setPassword("securePassword123");

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("USERNAME_NOT_AVAILABLE")));
    }

    @Test
    @Order(3)
    void testDuplicateEmailRejected() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setUsername("different_" + System.currentTimeMillis());
        request.setEmail(TEST_EMAIL_A);
        request.setPassword("securePassword123");

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("EMAIL_NOT_AVAILABLE")));
    }

    @Test
    @Order(4)
    void testLoginWithUsernameUserA() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setUsername(TEST_USERNAME_A);
        request.setPassword("securePassword123");

        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("Login Successful")))
                .andExpect(jsonPath("$.token", notNullValue()))
                .andReturn();

        String responseString = result.getResponse().getContentAsString();
        Map<?, ?> responseMap = objectMapper.readValue(responseString, Map.class);
        tokenA = "Bearer " + responseMap.get("token");
    }

    @Test
    @Order(5)
    void testLoginWithEmailUserA() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setUsername(TEST_EMAIL_A); // login using email in identifier
        request.setPassword("securePassword123");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("Login Successful")))
                .andExpect(jsonPath("$.token", notNullValue()));
    }

    @Test
    @Order(6)
    void testGetCurrentUserMe() throws Exception {
        MvcResult result = mockMvc.perform(get("/users/me")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is(TEST_USERNAME_A)))
                .andExpect(jsonPath("$.email", is(TEST_EMAIL_A)))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andReturn();

        String responseString = result.getResponse().getContentAsString();
        Map<?, ?> userMap = objectMapper.readValue(responseString, Map.class);
        userIdA = ((Number) userMap.get("id")).longValue();
    }

    @Test
    @Order(7)
    void testCreateBuildUserA() throws Exception {
        CreateBuildRequest request = new CreateBuildRequest();
        request.setName("User A Gaming Rig");
        request.setNotes("Built by User A");

        Components parts = new Components();
        parts.setCpu("Intel Core i9-14900K");
        parts.setGpu("Nvidia RTX 5090");
        parts.setCase("Lian Li O11 Dynamic");
        request.setComponents(parts);

        MvcResult result = mockMvc.perform(post("/builds")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("User A Gaming Rig")))
                .andExpect(jsonPath("$.parts.cpu", is("Intel Core i9-14900K")))
                .andExpect(jsonPath("$.username", is(TEST_USERNAME_A)))
                .andReturn();

        String responseString = result.getResponse().getContentAsString();
        Map<?, ?> responseMap = objectMapper.readValue(responseString, Map.class);
        buildIdA = ((Number) responseMap.get("id")).longValue();
    }

    @Test
    @Order(8)
    void testSignupAndLoginUserB() throws Exception {
        AuthRequest signupReq = new AuthRequest();
        signupReq.setUsername(TEST_USERNAME_B);
        signupReq.setEmail(TEST_EMAIL_B);
        signupReq.setPassword("userBPassword123");

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupReq)))
                .andExpect(status().isOk());

        AuthRequest loginReq = new AuthRequest();
        loginReq.setUsername(TEST_USERNAME_B);
        loginReq.setPassword("userBPassword123");

        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andReturn();

        String responseString = result.getResponse().getContentAsString();
        Map<?, ?> responseMap = objectMapper.readValue(responseString, Map.class);
        tokenB = "Bearer " + responseMap.get("token");
    }

    @Test
    @Order(9)
    void testUserBCannotSeeUserABuildsInList() throws Exception {
        // User B calls GET /builds -> should NOT include User A's build
        mockMvc.perform(get("/builds")
                        .header("Authorization", tokenB)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.builds", hasSize(0)));
    }

    @Test
    @Order(10)
    void testUserBCannotGetIndividualBuildOfUserA() throws Exception {
        // User B calls GET /builds/{buildIdA} -> should return 404 (or error)
        mockMvc.perform(get("/builds/" + buildIdA)
                        .header("Authorization", tokenB)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(11)
    void testUserBCannotUpdateBuildOfUserA() throws Exception {
        CreateBuildRequest updateReq = new CreateBuildRequest();
        updateReq.setName("Hacked Name");

        mockMvc.perform(put("/builds/" + buildIdA)
                        .header("Authorization", tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(12)
    void testUserBCannotDeleteBuildOfUserA() throws Exception {
        mockMvc.perform(delete("/builds/" + buildIdA)
                        .header("Authorization", tokenB)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(13)
    void testUserACanUpdateTheirOwnBuild() throws Exception {
        CreateBuildRequest updateReq = new CreateBuildRequest();
        updateReq.setName("User A Gaming Rig Updated");

        Components parts = new Components();
        parts.setCpu("AMD Ryzen 9 9950X");
        updateReq.setComponents(parts);

        mockMvc.perform(put("/builds/" + buildIdA)
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("User A Gaming Rig Updated")))
                .andExpect(jsonPath("$.parts.cpu", is("AMD Ryzen 9 9950X")));
    }

    @Test
    @Order(14)
    void testUserACanDeleteTheirOwnBuild() throws Exception {
        mockMvc.perform(delete("/builds/" + buildIdA)
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        // Verify it is completely removed from DB
        mockMvc.perform(get("/builds/" + buildIdA)
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
