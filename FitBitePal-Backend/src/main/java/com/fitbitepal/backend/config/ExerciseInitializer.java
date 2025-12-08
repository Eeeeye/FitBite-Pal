package com.fitbitepal.backend.config;

import com.fitbitepal.backend.model.Exercise;
import com.fitbitepal.backend.repository.ExerciseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * 运动库初始化器
 * 自动填充运动数据，包括 GIF 动图 URL
 * 
 * GIF 资源来源：
 * 1. ExerciseDB API (https://exercisedb.io/) - 1300+ 运动动图
 * 2. Wger.de (https://wger.de/) - 开源健身数据库
 * 3. 本地资源 /assets/exercises/
 */
@Component
@Order(2)  // 在 FoodItemInitializer 之后执行
@Slf4j
@RequiredArgsConstructor
public class ExerciseInitializer implements CommandLineRunner {
    
    private final ExerciseRepository exerciseRepository;
    
    // ExerciseDB GIF 基础 URL（需要 API Key，可免费注册）
    // 注册地址: https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
    private static final String EXERCISEDB_BASE = "https://v2.exercisedb.io/image/";
    
    // 备用：本地资源路径
    private static final String LOCAL_BASE = "/assets/exercises/";
    
    @Override
    public void run(String... args) {
        if (exerciseRepository.count() > 0) {
            log.info("✅ 运动库已有 {} 条数据，跳过初始化", exerciseRepository.count());
            return;
        }
        
        log.info("🏋️ 开始初始化运动库...");
        
        initCardioExercises();      // 有氧运动
        initStrengthExercises();    // 力量训练
        initCoreExercises();        // 核心训练
        initStretchExercises();     // 拉伸运动
        
        log.info("✅ 运动库初始化完成，共 {} 条数据", exerciseRepository.count());
    }
    
    /**
     * 有氧运动
     */
    private void initCardioExercises() {
        // 开合跳
        saveExercise(Exercise.builder()
                .name("Jumping Jacks")
                .nameZh("开合跳")
                .category("cardio")
                .bodyPart("full body")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Jumping-Jack.gif")
                .thumbnailUrl(LOCAL_BASE + "jumping-jacks.png")
                .defaultSets(3)
                .defaultReps(20)
                .defaultDuration(60)
                .caloriesPerMinute(10)
                .description("A full-body cardio exercise that improves cardiovascular fitness.")
                .descriptionZh("全身有氧运动，可有效提高心肺功能。")
                .instructions("[\"Stand with feet together and arms at sides\",\"Jump while spreading legs and raising arms overhead\",\"Jump back to starting position\",\"Repeat at a steady pace\"]")
                .instructionsZh("[\"双脚并拢站立，手臂自然下垂\",\"跳跃时双腿分开，双臂举过头顶\",\"跳回起始位置\",\"保持稳定节奏重复\"]")
                .tips("Keep your core engaged throughout the movement.")
                .tipsZh("整个动作过程中保持核心收紧。")
                .enabled(true)
                .build());
        
        // 高抬腿
        saveExercise(Exercise.builder()
                .name("High Knees")
                .nameZh("高抬腿")
                .category("cardio")
                .bodyPart("legs")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/High-Knee-Run.gif")
                .thumbnailUrl(LOCAL_BASE + "high-knees.png")
                .defaultSets(3)
                .defaultReps(30)
                .defaultDuration(45)
                .caloriesPerMinute(12)
                .description("A cardio exercise that strengthens legs and improves coordination.")
                .descriptionZh("增强腿部力量和协调性的有氧运动。")
                .instructions("[\"Stand with feet hip-width apart\",\"Drive one knee up toward chest\",\"Quickly switch legs\",\"Pump arms in opposition to legs\"]")
                .instructionsZh("[\"双脚与髋同宽站立\",\"将一侧膝盖抬向胸部\",\"快速交换双腿\",\"手臂与腿反向摆动\"]")
                .enabled(true)
                .build());
        
        // 波比跳
        saveExercise(Exercise.builder()
                .name("Burpees")
                .nameZh("波比跳")
                .category("cardio")
                .bodyPart("full body")
                .equipment("bodyweight")
                .difficulty("intermediate")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Burpee.gif")
                .thumbnailUrl(LOCAL_BASE + "burpees.png")
                .defaultSets(3)
                .defaultReps(10)
                .defaultDuration(60)
                .caloriesPerMinute(15)
                .description("A high-intensity full-body exercise combining squat, plank, and jump.")
                .descriptionZh("高强度全身运动，结合深蹲、平板支撑和跳跃。")
                .instructions("[\"Stand with feet shoulder-width apart\",\"Squat down and place hands on floor\",\"Jump feet back into plank position\",\"Do a push-up (optional)\",\"Jump feet forward to hands\",\"Jump up with arms overhead\"]")
                .instructionsZh("[\"双脚与肩同宽站立\",\"下蹲，双手撑地\",\"双脚向后跳至平板支撑\",\"做一个俯卧撑（可选）\",\"双脚跳回双手位置\",\"向上跳跃，双臂举过头顶\"]")
                .enabled(true)
                .build());
        
        // 登山者
        saveExercise(Exercise.builder()
                .name("Mountain Climbers")
                .nameZh("登山者")
                .category("cardio")
                .bodyPart("full body")
                .equipment("bodyweight")
                .difficulty("intermediate")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Mountain-Climber.gif")
                .thumbnailUrl(LOCAL_BASE + "mountain-climbers.png")
                .defaultSets(3)
                .defaultReps(20)
                .defaultDuration(45)
                .caloriesPerMinute(11)
                .description("A dynamic exercise that targets core and improves cardio endurance.")
                .descriptionZh("动态运动，锻炼核心并提高心肺耐力。")
                .enabled(true)
                .build());
    }
    
    /**
     * 力量训练
     */
    private void initStrengthExercises() {
        // 俯卧撑
        saveExercise(Exercise.builder()
                .name("Push-ups")
                .nameZh("俯卧撑")
                .category("strength")
                .bodyPart("chest")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif")
                .thumbnailUrl(LOCAL_BASE + "push-ups.png")
                .defaultSets(3)
                .defaultReps(15)
                .defaultDuration(60)
                .caloriesPerMinute(7)
                .description("A classic upper body exercise targeting chest, shoulders, and triceps.")
                .descriptionZh("经典上肢训练，锻炼胸部、肩部和三头肌。")
                .instructions("[\"Start in plank position with hands shoulder-width apart\",\"Lower body until chest nearly touches floor\",\"Keep core tight and body straight\",\"Push back up to starting position\"]")
                .instructionsZh("[\"以平板支撑姿势开始，双手与肩同宽\",\"身体下降至胸部几乎触地\",\"保持核心收紧，身体成一直线\",\"用力推起回到起始位置\"]")
                .poseKeyPoints("{\"shoulders\": [11,12], \"elbows\": [13,14], \"wrists\": [15,16], \"hips\": [23,24]}")
                .poseThresholds("{\"elbow_angle_min\": 70, \"elbow_angle_max\": 180, \"body_line_deviation\": 15}")
                .enabled(true)
                .build());
        
        // 深蹲
        saveExercise(Exercise.builder()
                .name("Squats")
                .nameZh("深蹲")
                .category("strength")
                .bodyPart("legs")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Bodyweight-Squat.gif")
                .thumbnailUrl(LOCAL_BASE + "squats.png")
                .defaultSets(3)
                .defaultReps(15)
                .defaultDuration(60)
                .caloriesPerMinute(6)
                .description("A fundamental lower body exercise targeting quads, glutes, and hamstrings.")
                .descriptionZh("基础下肢训练，锻炼股四头肌、臀部和腘绳肌。")
                .instructions("[\"Stand with feet shoulder-width apart\",\"Lower your body as if sitting in a chair\",\"Keep knees behind toes\",\"Push through heels to stand\"]")
                .instructionsZh("[\"双脚与肩同宽站立\",\"身体下蹲，如同坐椅子\",\"膝盖不超过脚尖\",\"用脚跟发力站起\"]")
                .poseKeyPoints("{\"hips\": [23,24], \"knees\": [25,26], \"ankles\": [27,28]}")
                .poseThresholds("{\"knee_angle_min\": 70, \"knee_angle_max\": 180, \"knee_over_toe\": false}")
                .enabled(true)
                .build());
        
        // 箭步蹲
        saveExercise(Exercise.builder()
                .name("Lunges")
                .nameZh("箭步蹲")
                .category("strength")
                .bodyPart("legs")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Bodyweight-Lunge.gif")
                .thumbnailUrl(LOCAL_BASE + "lunges.png")
                .defaultSets(3)
                .defaultReps(12)
                .defaultDuration(60)
                .caloriesPerMinute(6)
                .description("A unilateral leg exercise for strength and balance.")
                .descriptionZh("单侧腿部训练，增强力量和平衡感。")
                .enabled(true)
                .build());
        
        // 引体向上
        saveExercise(Exercise.builder()
                .name("Pull-ups")
                .nameZh("引体向上")
                .category("strength")
                .bodyPart("back")
                .equipment("pull-up bar")
                .difficulty("intermediate")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-Up.gif")
                .thumbnailUrl(LOCAL_BASE + "pull-ups.png")
                .defaultSets(3)
                .defaultReps(8)
                .defaultDuration(60)
                .caloriesPerMinute(8)
                .description("An upper body pulling exercise targeting lats and biceps.")
                .descriptionZh("上肢拉力训练，锻炼背阔肌和二头肌。")
                .enabled(true)
                .build());
        
        // 哑铃划船
        saveExercise(Exercise.builder()
                .name("Dumbbell Rows")
                .nameZh("哑铃划船")
                .category("strength")
                .bodyPart("back")
                .equipment("dumbbell")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif")
                .thumbnailUrl(LOCAL_BASE + "dumbbell-rows.png")
                .defaultSets(3)
                .defaultReps(12)
                .defaultDuration(60)
                .caloriesPerMinute(5)
                .description("A back exercise using dumbbells to strengthen lats and rhomboids.")
                .descriptionZh("使用哑铃的背部训练，增强背阔肌和菱形肌。")
                .enabled(true)
                .build());
        
        // 肩推
        saveExercise(Exercise.builder()
                .name("Shoulder Press")
                .nameZh("肩推")
                .category("strength")
                .bodyPart("shoulders")
                .equipment("dumbbell")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Shoulder-Press.gif")
                .thumbnailUrl(LOCAL_BASE + "shoulder-press.png")
                .defaultSets(3)
                .defaultReps(12)
                .defaultDuration(60)
                .caloriesPerMinute(5)
                .description("An overhead pressing movement for shoulder development.")
                .descriptionZh("过头推举动作，发展肩部肌肉。")
                .enabled(true)
                .build());
        
        // 臀桥
        saveExercise(Exercise.builder()
                .name("Glute Bridges")
                .nameZh("臀桥")
                .category("strength")
                .bodyPart("glutes")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Glute-Bridge.gif")
                .thumbnailUrl(LOCAL_BASE + "glute-bridges.png")
                .defaultSets(3)
                .defaultReps(15)
                .defaultDuration(45)
                .caloriesPerMinute(4)
                .description("A glute activation exercise that also strengthens lower back.")
                .descriptionZh("臀部激活训练，同时增强下背部力量。")
                .enabled(true)
                .build());
    }
    
    /**
     * 核心训练
     */
    private void initCoreExercises() {
        // 平板支撑
        saveExercise(Exercise.builder()
                .name("Plank")
                .nameZh("平板支撑")
                .category("core")
                .bodyPart("core")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Plank.gif")
                .thumbnailUrl(LOCAL_BASE + "plank.png")
                .defaultSets(3)
                .defaultReps(1)
                .defaultDuration(60)
                .caloriesPerMinute(4)
                .description("An isometric core exercise that builds stability and endurance.")
                .descriptionZh("等长核心训练，增强稳定性和耐力。")
                .instructions("[\"Start in forearm plank position\",\"Keep body in straight line\",\"Engage core and glutes\",\"Hold for specified duration\"]")
                .instructionsZh("[\"以前臂平板支撑姿势开始\",\"保持身体成一直线\",\"收紧核心和臀部\",\"保持规定时间\"]")
                .poseKeyPoints("{\"shoulders\": [11,12], \"hips\": [23,24], \"ankles\": [27,28]}")
                .poseThresholds("{\"body_line_deviation\": 10, \"hip_drop_max\": 15}")
                .enabled(true)
                .build());
        
        // 卷腹
        saveExercise(Exercise.builder()
                .name("Crunches")
                .nameZh("卷腹")
                .category("core")
                .bodyPart("core")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Crunch.gif")
                .thumbnailUrl(LOCAL_BASE + "crunches.png")
                .defaultSets(3)
                .defaultReps(20)
                .defaultDuration(45)
                .caloriesPerMinute(5)
                .description("A classic abdominal exercise targeting the rectus abdominis.")
                .descriptionZh("经典腹部训练，锻炼腹直肌。")
                .enabled(true)
                .build());
        
        // 俄罗斯转体
        saveExercise(Exercise.builder()
                .name("Russian Twists")
                .nameZh("俄罗斯转体")
                .category("core")
                .bodyPart("core")
                .equipment("bodyweight")
                .difficulty("intermediate")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Russian-Twist.gif")
                .thumbnailUrl(LOCAL_BASE + "russian-twists.png")
                .defaultSets(3)
                .defaultReps(20)
                .defaultDuration(45)
                .caloriesPerMinute(5)
                .description("A rotational core exercise targeting obliques.")
                .descriptionZh("旋转核心训练，锻炼腹斜肌。")
                .enabled(true)
                .build());
        
        // 抬腿
        saveExercise(Exercise.builder()
                .name("Leg Raises")
                .nameZh("抬腿")
                .category("core")
                .bodyPart("core")
                .equipment("bodyweight")
                .difficulty("intermediate")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Raise.gif")
                .thumbnailUrl(LOCAL_BASE + "leg-raises.png")
                .defaultSets(3)
                .defaultReps(15)
                .defaultDuration(45)
                .caloriesPerMinute(4)
                .description("A lower ab exercise that builds core strength.")
                .descriptionZh("下腹部训练，增强核心力量。")
                .enabled(true)
                .build());
        
        // 空中蹬车
        saveExercise(Exercise.builder()
                .name("Bicycle Crunches")
                .nameZh("空中蹬车")
                .category("core")
                .bodyPart("core")
                .equipment("bodyweight")
                .difficulty("intermediate")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Bicycle-Crunch.gif")
                .thumbnailUrl(LOCAL_BASE + "bicycle-crunches.png")
                .defaultSets(3)
                .defaultReps(20)
                .defaultDuration(45)
                .caloriesPerMinute(6)
                .description("A dynamic core exercise combining crunch with leg movement.")
                .descriptionZh("动态核心训练，结合卷腹和腿部运动。")
                .enabled(true)
                .build());
    }
    
    /**
     * 拉伸运动
     */
    private void initStretchExercises() {
        // 猫牛式拉伸
        saveExercise(Exercise.builder()
                .name("Cat-Cow Stretch")
                .nameZh("猫牛式拉伸")
                .category("stretch")
                .bodyPart("back")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Cat-Cow-Stretch.gif")
                .thumbnailUrl(LOCAL_BASE + "cat-cow.png")
                .defaultSets(1)
                .defaultReps(10)
                .defaultDuration(60)
                .caloriesPerMinute(2)
                .description("A gentle spinal mobility exercise for warm-up or cool-down.")
                .descriptionZh("温和的脊柱活动训练，适合热身或放松。")
                .enabled(true)
                .build());
        
        // 超人式
        saveExercise(Exercise.builder()
                .name("Superman Hold")
                .nameZh("超人式支撑")
                .category("stretch")
                .bodyPart("back")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Superman.gif")
                .thumbnailUrl(LOCAL_BASE + "superman.png")
                .defaultSets(3)
                .defaultReps(10)
                .defaultDuration(45)
                .caloriesPerMinute(3)
                .description("A back extension exercise that strengthens the posterior chain.")
                .descriptionZh("背部伸展训练，增强后链肌群。")
                .enabled(true)
                .build());
        
        // 鸟狗式
        saveExercise(Exercise.builder()
                .name("Bird Dog")
                .nameZh("鸟狗式")
                .category("stretch")
                .bodyPart("core")
                .equipment("bodyweight")
                .difficulty("beginner")
                .gifUrl("https://fitnessprogramer.com/wp-content/uploads/2021/02/Bird-Dog.gif")
                .thumbnailUrl(LOCAL_BASE + "bird-dog.png")
                .defaultSets(3)
                .defaultReps(10)
                .defaultDuration(45)
                .caloriesPerMinute(3)
                .description("A stability exercise for core and spine health.")
                .descriptionZh("稳定性训练，有益核心和脊柱健康。")
                .enabled(true)
                .build());
    }
    
    /**
     * 保存运动数据
     */
    private void saveExercise(Exercise exercise) {
        try {
            exerciseRepository.save(exercise);
            log.debug("✅ 已添加运动: {}", exercise.getName());
        } catch (Exception e) {
            log.error("❌ 添加运动失败: {} - {}", exercise.getName(), e.getMessage());
        }
    }
}

