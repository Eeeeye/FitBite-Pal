package com.fitbitepal.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI / Swagger 配置
 * 提供 API 文档和交互式 API 测试界面
 * 
 * 访问地址:
 * - Swagger UI: http://localhost:8080/api/swagger-ui.html
 * - OpenAPI JSON: http://localhost:8080/api/v3/api-docs
 * 
 * @author FitBitePal Team
 */
@Configuration
public class OpenApiConfig {
    
    @Value("${server.port:8080}")
    private String serverPort;
    
    @Bean
    public OpenAPI fitBitePalOpenAPI() {
        // JWT 安全方案
        final String securitySchemeName = "bearerAuth";
        
        return new OpenAPI()
                .info(apiInfo())
                .servers(List.of(
                        new Server()
                                .url("http://localhost:" + serverPort + "/api")
                                .description("本地开发服务器"),
                        new Server()
                                .url("https://api.fitbitepal.com/api")
                                .description("生产环境服务器")
                ))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(
                        new Components()
                                .addSecuritySchemes(securitySchemeName,
                                        new SecurityScheme()
                                                .name(securitySchemeName)
                                                .type(SecurityScheme.Type.HTTP)
                                                .scheme("bearer")
                                                .bearerFormat("JWT")
                                                .description("JWT 认证令牌")
                                )
                );
    }
    
    private Info apiInfo() {
        return new Info()
                .title("FitBitePal API")
                .description("""
                        # FitBitePal Backend API 文档
                        
                        FitBitePal 是一款智能健身与饮食管理应用，提供以下核心功能：
                        
                        ## 功能模块
                        
                        ### 🔐 认证模块 (Auth)
                        - 用户注册、登录、退出
                        - 密码找回（邮件验证码）
                        - JWT 令牌刷新
                        
                        ### 👤 用户模块 (User)
                        - 个人资料管理
                        - 身体数据管理（身高、体重、年龄等）
                        - 健身目标设置
                        
                        ### 💪 训练计划模块 (Training/Plan)
                        - AI 生成个性化训练计划
                        - 训练打卡记录
                        - 训练历史查询
                        
                        ### 🍎 饮食管理模块 (Diet)
                        - AI 食物识别（拍照识别营养成分）
                        - 饮食记录
                        - 营养统计分析
                        
                        ### 🤖 AI 功能模块 (AI)
                        - 食物图片识别
                        - AI 健身/营养建议
                        
                        ### 🏃 姿态识别模块 (Pose)
                        - 实时运动姿态分析
                        - 姿态纠正反馈
                        - 训练会话管理
                        
                        ### 📊 数据统计模块 (Data/Records)
                        - 体重记录与趋势
                        - 卡路里摄入统计
                        - 训练数据分析
                        
                        ## 使用说明
                        
                        1. **认证**: 大多数接口需要 JWT 认证，请先调用登录接口获取 token
                        2. **Authorization Header**: 在请求头中添加 `Authorization: Bearer <your_token>`
                        3. **开发模式**: AI 和姿态识别功能默认使用 Mock 数据，可在配置中启用真实服务
                        
                        ## 技术栈
                        - Spring Boot 3.2.0
                        - Spring Security + JWT
                        - MySQL + JPA
                        - Redis (缓存)
                        - JavaMail (邮件服务)
                        """)
                .version("1.0.0")
                .contact(new Contact()
                        .name("FitBitePal Team")
                        .email("support@fitbitepal.com")
                        .url("https://fitbitepal.com"))
                .license(new License()
                        .name("Apache 2.0")
                        .url("https://www.apache.org/licenses/LICENSE-2.0.html"));
    }
}


