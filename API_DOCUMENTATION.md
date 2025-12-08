# FitBitePal API 接口文档

> **版本**: 1.0.0  
> **Base URL**: `http://your-server:8080/api`  
> **认证方式**: JWT Bearer Token

---

## 目录

1. [通用说明](#1-通用说明)
2. [认证接口](#2-认证接口)
3. [用户接口](#3-用户接口)
4. [训练计划接口](#4-训练计划接口)
5. [饮食管理接口](#5-饮食管理接口)
6. [数据统计接口](#6-数据统计接口)
7. [AI 服务接口](#7-ai-服务接口)
8. [管理接口](#8-管理接口)
9. [错误码说明](#9-错误码说明)

---

## 1. 通用说明

### 1.1 请求格式

所有请求使用 JSON 格式：

```http
Content-Type: application/json
```

### 1.2 认证方式

除登录/注册外，所有接口需要在 Header 中携带 JWT Token：

```http
Authorization: Bearer <your_jwt_token>
```

### 1.3 响应格式

**成功响应：**
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "错误描述",
  "data": null
}
```

### 1.4 分页参数

支持分页的接口使用以下参数：

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| page | int | 页码（从0开始） | 0 |
| size | int | 每页数量 | 20 |
| sort | string | 排序字段 | - |

---

## 2. 认证接口

### 2.1 用户注册

**POST** `/auth/register`

**请求体：**
```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com"
  }
}
```

### 2.2 用户登录

**POST** `/auth/login`

**请求体：**
```json
{
  "usernameOrEmail": "user@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": 1,
    "username": "user123",
    "role": "USER"
  }
}
```

### 2.3 忘记密码

**POST** `/auth/forgot-password`

**请求体：**
```json
{
  "email": "user@example.com"
}
```

### 2.4 重置密码

**POST** `/auth/reset-password`

**请求体：**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newPassword123"
}
```

### 2.5 发送验证码

**POST** `/auth/send-verification`

**请求体：**
```json
{
  "email": "user@example.com",
  "type": "REGISTER"  // REGISTER | RESET_PASSWORD
}
```

---

## 3. 用户接口

### 3.1 获取用户信息

**GET** `/users/{userId}`

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "gender": "male",
    "age": 25,
    "height": 175.0,
    "weight": 70.0,
    "goal": "fat_loss",
    "activityLevel": "moderate",
    "trainingDuration": 30,
    "trainingIntensity": "intermediate",
    "trainingArea": "full_body",
    "profileCompleted": true
  }
}
```

### 3.2 保存用户资料

**POST** `/users/{userId}/profile`

**请求体：**
```json
{
  "gender": "male",
  "age": 25,
  "height": 175.0,
  "weight": 70.0,
  "goal": "fat_loss",
  "activityLevel": "moderate",
  "trainingDuration": 30
}
```

### 3.3 获取训练计划

**GET** `/users/{userId}/training-plan`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| date | string | 日期 (YYYY-MM-DD)，默认今天 |

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "planDate": "2025-11-27",
    "duration": 30,
    "intensity": "intermediate",
    "bodyPart": "upper_body",
    "exercises": [
      {
        "id": 1,
        "name": "俯卧撑",
        "nameEn": "Push-ups",
        "sets": 3,
        "reps": 12,
        "duration": null,
        "restTime": 60,
        "imageUrl": "/images/push-ups.gif",
        "completed": false
      }
    ],
    "totalCalories": 250
  }
}
```

### 3.4 获取饮食计划

**GET** `/users/{userId}/diet-plan`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| date | string | 日期 (YYYY-MM-DD)，默认今天 |

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "planDate": "2025-11-27",
    "targetCalories": 2000,
    "meals": {
      "breakfast": {
        "name": "燕麦粥配蓝莓",
        "nameEn": "Oatmeal with Blueberries",
        "calories": 280,
        "protein": 8,
        "carbs": 45,
        "fat": 6
      },
      "lunch": { ... },
      "dinner": { ... }
    }
  }
}
```

### 3.5 调整训练计划

**POST** `/users/{userId}/adjust-plan`

**请求体：**
```json
{
  "duration": 45,
  "intensity": "advanced",
  "bodyPart": "lower_body"
}
```

### 3.6 用户打卡

**POST** `/users/{userId}/check-in`

**请求体：**
```json
{
  "weight": 69.5,
  "height": 175.0
}
```

---

## 4. 训练计划接口

### 4.1 获取运动库列表

**GET** `/exercises`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| bodyPart | string | 身体部位筛选 |
| difficulty | string | 难度筛选 |

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "俯卧撑",
      "nameEn": "Push-ups",
      "bodyPart": "chest",
      "difficulty": "beginner",
      "caloriesPerMinute": 8,
      "imageUrl": "/images/push-ups.gif",
      "description": "锻炼胸肌和三头肌的经典动作"
    }
  ]
}
```

### 4.2 获取运动详情

**GET** `/exercises/{exerciseId}`

### 4.3 标记运动完成

**POST** `/exercises/{planExerciseId}/complete`

**请求体：**
```json
{
  "userId": 1,
  "actualSets": 3,
  "actualReps": 12,
  "duration": 300
}
```

---

## 5. 饮食管理接口

### 5.1 获取食品列表

**GET** `/foods`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 分类筛选 |
| search | string | 名称搜索 |
| page | int | 页码 |
| size | int | 每页数量 |

### 5.2 记录饮食

**POST** `/diet/records`

**请求体：**
```json
{
  "userId": 1,
  "mealType": "lunch",
  "foods": [
    {
      "foodId": 1,
      "amount": 150,
      "unit": "g"
    }
  ],
  "recordDate": "2025-11-27"
}
```

### 5.3 获取饮食记录

**GET** `/diet/records`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| userId | long | 用户ID |
| date | string | 日期 |

---

## 6. 数据统计接口

### 6.1 获取体重记录

**GET** `/data/weight`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| userId | long | 用户ID |
| days | int | 天数（7/30/90） |

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-25",
      "weight": 70.5
    },
    {
      "date": "2025-11-26",
      "weight": 70.2
    },
    {
      "date": "2025-11-27",
      "weight": 69.8
    }
  ]
}
```

### 6.2 获取热量记录

**GET** `/data/calories`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| userId | long | 用户ID |
| days | int | 天数 |

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-27",
      "intake": 1850,
      "burned": 2100,
      "bmr": 1650
    }
  ]
}
```

### 6.3 获取综合统计

**GET** `/data/statistics`

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| userId | long | 用户ID |
| period | string | 周期（week/month） |

---

## 7. AI 服务接口

### 7.1 食物识别

**POST** `/ai/recognize-food`

**请求体：**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "recognizedFoods": [
      {
        "name": "红烧肉",
        "confidence": 0.92,
        "calories": 350,
        "protein": 15,
        "carbs": 5,
        "fat": 28
      }
    ]
  }
}
```

### 7.2 姿态分析结果保存

**POST** `/pose/sessions`

**请求体：**
```json
{
  "userId": 1,
  "exerciseId": 1,
  "startTime": "2025-11-27T10:00:00",
  "endTime": "2025-11-27T10:05:00",
  "totalReps": 36,
  "correctReps": 30,
  "feedback": ["注意膝盖不要内扣", "保持核心收紧"]
}
```

---

## 8. 管理接口

> 需要 ADMIN 角色权限

### 8.1 仪表盘数据

**GET** `/admin/dashboard`

**响应：**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "todayCheckIns": 328,
    "totalFoods": 156,
    "totalMealSets": 48
  }
}
```

### 8.2 用户管理

**GET** `/admin/users` - 获取用户列表
**GET** `/admin/users/{userId}` - 获取用户详情
**PUT** `/admin/users/{userId}` - 更新用户信息
**DELETE** `/admin/users/{userId}` - 删除用户

### 8.3 食品库管理

**GET** `/admin/foods` - 获取食品列表
**POST** `/admin/foods` - 添加食品
**PUT** `/admin/foods/{foodId}` - 更新食品
**DELETE** `/admin/foods/{foodId}` - 删除食品（软删除）

### 8.4 套餐管理

**GET** `/admin/meal-sets` - 获取套餐列表
**POST** `/admin/meal-sets` - 添加套餐
**PUT** `/admin/meal-sets/{id}` - 更新套餐
**DELETE** `/admin/meal-sets/{id}` - 删除套餐（软删除）

### 8.5 系统配置

**GET** `/admin/configs` - 获取配置列表
**POST** `/admin/configs` - 保存配置
**POST** `/admin/configs/init` - 初始化默认配置

---

## 9. 错误码说明

| HTTP 状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | BAD_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未认证或 Token 过期 |
| 403 | FORBIDDEN | 无权限访问 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突（如用户名已存在） |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

### 常见错误响应

**Token 过期：**
```json
{
  "success": false,
  "message": "Token expired",
  "data": null
}
```

**参数验证失败：**
```json
{
  "success": false,
  "message": "Validation failed: email must be valid",
  "data": null
}
```

---

## 附录

### A. 枚举值说明

**用户目标 (goal)：**
- `fat_loss` - 减脂
- `muscle_gain` - 增肌
- `health` - 保持健康

**活动水平 (activityLevel)：**
- `sedentary` - 久坐
- `light` - 轻度活动
- `moderate` - 中度活动
- `heavy` - 重度活动

**训练强度 (intensity)：**
- `beginner` - 初级
- `intermediate` - 中级
- `advanced` - 高级

**训练部位 (bodyPart)：**
- `upper_body` - 上肢
- `lower_body` - 下肢
- `core` - 核心
- `full_body` - 全身

**食品分类 (category)：**
- `staple` - 主食
- `vegetable` - 蔬菜
- `fruit` - 水果
- `meat` - 肉类
- `seafood` - 海鲜
- `dairy` - 蛋奶
- `beverage` - 饮品
- `other` - 其他

---

**文档版本**: 1.0.0  
**最后更新**: 2025-11-27

