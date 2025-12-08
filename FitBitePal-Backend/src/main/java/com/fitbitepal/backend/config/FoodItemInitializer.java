package com.fitbitepal.backend.config;

import com.fitbitepal.backend.model.FoodItem;
import com.fitbitepal.backend.model.MealSet;
import com.fitbitepal.backend.repository.FoodItemRepository;
import com.fitbitepal.backend.repository.MealSetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 食品库和套餐数据初始化器
 * 应用启动时自动导入数据
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FoodItemInitializer implements CommandLineRunner {

    private final FoodItemRepository foodItemRepository;
    private final MealSetRepository mealSetRepository;

    @Override
    public void run(String... args) {
        initializeFoodItems();
        initializeMealSets();
    }

    /**
     * 初始化食品库
     */
    private void initializeFoodItems() {
        if (foodItemRepository.count() > 0) {
            log.info("食品库已有 {} 条数据，跳过初始化", foodItemRepository.count());
            return;
        }

        log.info("开始初始化食品库数据...");
        List<FoodItem> foods = new ArrayList<>();

        // ========== 主食类 ==========
        foods.add(createFood("白米饭", "White Rice", "主食", 116, 2.6, 25.6, 0.3, "1碗", 150.0, "米饭,白饭,蒸饭"));
        foods.add(createFood("糙米饭", "Brown Rice", "主食", 111, 2.6, 23.0, 0.9, "1碗", 150.0, "糙米,玄米"));
        foods.add(createFood("燕麦", "Oatmeal", "主食", 367, 13.5, 66.3, 6.7, "50g", 50.0, "燕麦片,麦片"));
        foods.add(createFood("全麦面包", "Whole Wheat Bread", "主食", 247, 8.8, 43.3, 4.4, "2片", 60.0, "全麦吐司"));
        foods.add(createFood("全麦吐司", "Whole Wheat Toast", "主食", 247, 8.8, 43.3, 4.4, "2片", 60.0, "吐司"));
        foods.add(createFood("面条", "Noodles", "主食", 138, 4.5, 28.4, 0.6, "1碗", 200.0, "挂面,拉面"));
        foods.add(createFood("意面", "Pasta", "主食", 158, 5.8, 30.9, 0.9, "1份", 150.0, "意大利面"));
        foods.add(createFood("馒头", "Steamed Bun", "主食", 221, 7.0, 45.7, 1.1, "1个", 100.0, "馍"));
        foods.add(createFood("包子", "Baozi", "主食", 200, 7.5, 32.0, 5.0, "1个", 80.0, "肉包子"));
        foods.add(createFood("饺子", "Dumplings", "主食", 185, 8.0, 25.0, 6.0, "10个", 200.0, "水饺,蒸饺"));
        foods.add(createFood("油条", "Fried Dough Stick", "主食", 386, 6.0, 51.0, 17.0, "1根", 50.0, "炸油条"));
        foods.add(createFood("杂粮", "Mixed Grains", "主食", 340, 10.0, 65.0, 3.0, "50g", 50.0, "杂粮粥"));
        foods.add(createFood("小米", "Millet", "主食", 358, 9.0, 73.0, 3.1, "50g", 50.0, "小米粥"));
        foods.add(createFood("紫薯", "Purple Sweet Potato", "主食", 82, 1.3, 18.7, 0.1, "1个", 150.0, "紫心地瓜"));
        foods.add(createFood("土豆", "Potato", "主食", 77, 2.0, 17.5, 0.1, "1个", 150.0, "马铃薯"));
        foods.add(createFood("土豆泥", "Mashed Potato", "主食", 83, 1.9, 15.0, 2.0, "1份", 150.0, "薯泥"));
        foods.add(createFood("藜麦", "Quinoa", "主食", 368, 14.0, 64.0, 6.0, "50g", 50.0, "quinoa"));
        foods.add(createFood("薯条", "French Fries", "主食", 312, 3.4, 41.0, 15.0, "1份", 150.0, "炸薯条"));

        // ========== 肉类 ==========
        foods.add(createFood("鸡胸肉", "Chicken Breast", "肉类", 133, 31.0, 0.0, 1.2, "100g", 100.0, "鸡胸,鸡肉"));
        foods.add(createFood("鸡腿", "Chicken Thigh", "肉类", 209, 17.0, 0.0, 15.5, "1个", 100.0, "鸡腿肉"));
        foods.add(createFood("牛肉", "Beef", "肉类", 250, 26.0, 0.0, 15.0, "100g", 100.0, "牛排,牛腩"));
        foods.add(createFood("牛里脊", "Beef Tenderloin", "肉类", 155, 22.0, 0.0, 7.0, "100g", 100.0, "牛柳"));
        foods.add(createFood("牛排", "Steak", "肉类", 271, 26.0, 0.0, 18.0, "200g", 200.0, "西冷牛排"));
        foods.add(createFood("猪里脊", "Pork Tenderloin", "肉类", 143, 21.0, 1.5, 5.5, "100g", 100.0, "瘦肉"));
        foods.add(createFood("五花肉", "Pork Belly", "肉类", 518, 9.0, 0.0, 53.0, "100g", 100.0, "五花"));
        foods.add(createFood("排骨", "Pork Ribs", "肉类", 264, 18.0, 0.0, 21.0, "100g", 100.0, "猪排骨"));
        foods.add(createFood("培根", "Bacon", "肉类", 541, 37.0, 1.4, 42.0, "3片", 30.0, "烟熏培根"));
        foods.add(createFood("火腿", "Ham", "肉类", 145, 18.0, 1.5, 7.0, "50g", 50.0, "火腿肠"));
        foods.add(createFood("猪排", "Pork Chop", "肉类", 250, 25.0, 5.0, 14.0, "200g", 200.0, "炸猪排"));

        // ========== 海鲜类 ==========
        foods.add(createFood("三文鱼", "Salmon", "海鲜", 208, 20.0, 0.0, 13.0, "100g", 100.0, "鲑鱼"));
        foods.add(createFood("虾仁", "Shrimp", "海鲜", 99, 24.0, 0.2, 0.3, "100g", 100.0, "虾"));
        foods.add(createFood("鲈鱼", "Sea Bass", "海鲜", 97, 18.0, 0.0, 2.0, "200g", 200.0, "清蒸鲈鱼"));
        foods.add(createFood("龙利鱼", "Sole Fish", "海鲜", 88, 17.0, 0.0, 2.0, "150g", 150.0, "龙利鱼柳"));

        // ========== 蛋奶类 ==========
        foods.add(createFood("鸡蛋", "Egg", "蛋奶", 144, 13.0, 0.7, 9.5, "1个", 50.0, "蛋,煎蛋,水煮蛋"));
        foods.add(createFood("牛奶", "Milk", "蛋奶", 66, 3.2, 5.0, 3.6, "1杯", 250.0, "全脂牛奶,鲜奶"));
        foods.add(createFood("脱脂牛奶", "Skim Milk", "蛋奶", 35, 3.4, 5.0, 0.1, "1杯", 250.0, "低脂奶"));
        foods.add(createFood("酸奶", "Yogurt", "蛋奶", 72, 3.5, 9.3, 2.5, "1杯", 150.0, "酸牛奶"));
        foods.add(createFood("希腊酸奶", "Greek Yogurt", "蛋奶", 97, 9.0, 4.0, 5.0, "150g", 150.0, "希腊式酸奶"));
        foods.add(createFood("芝士", "Cheese", "蛋奶", 402, 25.0, 1.3, 33.0, "2片", 40.0, "奶酪"));
        foods.add(createFood("豆浆", "Soy Milk", "蛋奶", 33, 2.9, 1.2, 1.6, "1杯", 300.0, "豆奶"));
        foods.add(createFood("豆腐", "Tofu", "蛋奶", 76, 8.0, 1.9, 4.2, "100g", 100.0, "嫩豆腐"));
        foods.add(createFood("豆腐脑", "Tofu Pudding", "蛋奶", 15, 1.5, 0.8, 0.6, "200ml", 200.0, "豆花"));
        foods.add(createFood("蛋白粉", "Protein Powder", "蛋奶", 380, 80.0, 5.0, 3.0, "30g", 30.0, "乳清蛋白"));
        foods.add(createFood("咸鸭蛋", "Salted Duck Egg", "蛋奶", 190, 13.0, 3.0, 14.0, "1个", 60.0, "咸蛋"));

        // ========== 蔬菜类 ==========
        foods.add(createFood("西兰花", "Broccoli", "蔬菜", 34, 2.8, 6.6, 0.4, "100g", 100.0, "花椰菜"));
        foods.add(createFood("菠菜", "Spinach", "蔬菜", 23, 2.9, 3.6, 0.4, "100g", 100.0, "青菜"));
        foods.add(createFood("番茄", "Tomato", "蔬菜", 18, 0.9, 3.9, 0.2, "1个", 150.0, "西红柿"));
        foods.add(createFood("黄瓜", "Cucumber", "蔬菜", 16, 0.7, 3.6, 0.1, "1根", 200.0, "青瓜"));
        foods.add(createFood("胡萝卜", "Carrot", "蔬菜", 41, 0.9, 9.6, 0.2, "1根", 100.0, "红萝卜"));
        foods.add(createFood("青椒", "Green Pepper", "蔬菜", 20, 0.9, 4.6, 0.2, "1个", 80.0, "甜椒,彩椒"));
        foods.add(createFood("芦笋", "Asparagus", "蔬菜", 20, 2.2, 3.9, 0.1, "100g", 100.0, ""));
        foods.add(createFood("生菜", "Lettuce", "蔬菜", 15, 1.4, 2.9, 0.2, "100g", 100.0, "沙拉菜"));
        foods.add(createFood("白菜", "Chinese Cabbage", "蔬菜", 13, 1.5, 2.2, 0.1, "100g", 100.0, "大白菜"));
        foods.add(createFood("油菜", "Bok Choy", "蔬菜", 15, 1.8, 2.3, 0.2, "100g", 100.0, "青菜"));
        foods.add(createFood("木耳", "Wood Ear", "蔬菜", 21, 0.5, 5.0, 0.1, "50g", 50.0, "黑木耳"));
        foods.add(createFood("菌菇", "Mushroom", "蔬菜", 22, 3.0, 3.3, 0.3, "100g", 100.0, "蘑菇,香菇"));
        foods.add(createFood("海带", "Kelp", "蔬菜", 13, 1.2, 2.0, 0.1, "100g", 100.0, "海带丝"));
        foods.add(createFood("茄子", "Eggplant", "蔬菜", 25, 1.1, 5.9, 0.1, "200g", 200.0, ""));
        foods.add(createFood("卷心菜", "Cabbage", "蔬菜", 25, 1.3, 5.8, 0.1, "100g", 100.0, "包菜"));
        foods.add(createFood("萝卜", "Radish", "蔬菜", 18, 0.6, 4.1, 0.1, "100g", 100.0, "白萝卜"));
        foods.add(createFood("豌豆", "Peas", "蔬菜", 81, 5.4, 14.5, 0.4, "50g", 50.0, "青豆"));
        foods.add(createFood("玉米", "Corn", "蔬菜", 86, 3.2, 19.0, 1.2, "1根", 100.0, "甜玉米"));

        // ========== 水果类 ==========
        foods.add(createFood("苹果", "Apple", "水果", 52, 0.3, 14.0, 0.2, "1个", 180.0, ""));
        foods.add(createFood("香蕉", "Banana", "水果", 89, 1.1, 22.8, 0.3, "1根", 120.0, ""));
        foods.add(createFood("蓝莓", "Blueberry", "水果", 57, 0.7, 14.5, 0.3, "50g", 50.0, ""));
        foods.add(createFood("草莓", "Strawberry", "水果", 32, 0.7, 7.7, 0.3, "100g", 100.0, ""));
        foods.add(createFood("牛油果", "Avocado", "水果", 160, 2.0, 8.5, 15.0, "半个", 80.0, "鳄梨"));

        // ========== 调味/其他 ==========
        foods.add(createFood("橄榄油", "Olive Oil", "调味", 884, 0.0, 0.0, 100.0, "10g", 10.0, ""));
        foods.add(createFood("花生酱", "Peanut Butter", "调味", 588, 25.0, 20.0, 50.0, "20g", 20.0, ""));
        foods.add(createFood("蜂蜜", "Honey", "调味", 304, 0.3, 82.4, 0.0, "10g", 10.0, ""));
        foods.add(createFood("混合坚果", "Mixed Nuts", "其他", 607, 20.0, 21.0, 54.0, "30g", 30.0, "坚果"));
        foods.add(createFood("花生", "Peanut", "其他", 567, 26.0, 16.0, 49.0, "30g", 30.0, ""));

        // 保存所有食品
        foodItemRepository.saveAll(foods);
        log.info("✅ 食品库初始化完成，共导入 {} 种食品", foods.size());
    }

    /**
     * 初始化套餐数据
     */
    private void initializeMealSets() {
        if (mealSetRepository.count() > 0) {
            log.info("套餐库已有 {} 条数据，跳过初始化", mealSetRepository.count());
            return;
        }

        log.info("开始初始化套餐数据...");
        List<MealSet> mealSets = new ArrayList<>();

        // ========== 减脂套餐 - 早餐 ==========
        mealSets.add(createMealSet("燕麦粥配蓝莓", "Breakfast", "Lose weight",
            "[{\"name\":\"燕麦\",\"amount\":\"50g\"},{\"name\":\"蓝莓\",\"amount\":\"30g\"},{\"name\":\"脱脂牛奶\",\"amount\":\"200ml\"}]",
            280, 12, 45, 6));
        mealSets.add(createMealSet("全麦吐司配牛油果", "Breakfast", "Lose weight",
            "[{\"name\":\"全麦吐司\",\"amount\":\"2片\"},{\"name\":\"牛油果\",\"amount\":\"半个\"},{\"name\":\"鸡蛋\",\"amount\":\"1个\"}]",
            320, 14, 35, 15));
        mealSets.add(createMealSet("希腊酸奶配坚果", "Breakfast", "Lose weight",
            "[{\"name\":\"希腊酸奶\",\"amount\":\"150g\"},{\"name\":\"混合坚果\",\"amount\":\"20g\"},{\"name\":\"蜂蜜\",\"amount\":\"5g\"}]",
            250, 18, 20, 12));
        mealSets.add(createMealSet("蔬菜蛋饼", "Breakfast", "Lose weight",
            "[{\"name\":\"鸡蛋\",\"amount\":\"2个\"},{\"name\":\"菠菜\",\"amount\":\"50g\"},{\"name\":\"番茄\",\"amount\":\"1个\"}]",
            240, 16, 8, 16));
        mealSets.add(createMealSet("小米粥配咸鸭蛋", "Breakfast", "Lose weight",
            "[{\"name\":\"小米\",\"amount\":\"50g\"},{\"name\":\"咸鸭蛋\",\"amount\":\"1个\"},{\"name\":\"凉拌黄瓜\",\"amount\":\"100g\"}]",
            290, 12, 40, 10));
        mealSets.add(createMealSet("紫薯燕麦奶昔", "Breakfast", "Lose weight",
            "[{\"name\":\"紫薯\",\"amount\":\"100g\"},{\"name\":\"燕麦\",\"amount\":\"30g\"},{\"name\":\"牛奶\",\"amount\":\"200ml\"}]",
            300, 10, 52, 5));
        mealSets.add(createMealSet("鸡蛋三明治", "Breakfast", "Lose weight",
            "[{\"name\":\"全麦面包\",\"amount\":\"2片\"},{\"name\":\"鸡蛋\",\"amount\":\"1个\"},{\"name\":\"生菜\",\"amount\":\"30g\"},{\"name\":\"番茄\",\"amount\":\"2片\"}]",
            270, 13, 32, 10));

        // ========== 减脂套餐 - 午餐 ==========
        mealSets.add(createMealSet("鸡胸肉沙拉", "Lunch", "Lose weight",
            "[{\"name\":\"鸡胸肉\",\"amount\":\"150g\"},{\"name\":\"混合生菜\",\"amount\":\"100g\"},{\"name\":\"橄榄油\",\"amount\":\"5g\"},{\"name\":\"藜麦\",\"amount\":\"50g\"}]",
            420, 42, 35, 12));
        mealSets.add(createMealSet("清蒸鱼配糙米饭", "Lunch", "Lose weight",
            "[{\"name\":\"鲈鱼\",\"amount\":\"200g\"},{\"name\":\"糙米饭\",\"amount\":\"100g\"},{\"name\":\"西兰花\",\"amount\":\"100g\"}]",
            450, 38, 45, 10));
        mealSets.add(createMealSet("牛肉蔬菜卷", "Lunch", "Lose weight",
            "[{\"name\":\"牛里脊\",\"amount\":\"120g\"},{\"name\":\"生菜\",\"amount\":\"50g\"},{\"name\":\"彩椒\",\"amount\":\"50g\"},{\"name\":\"全麦饼\",\"amount\":\"1张\"}]",
            380, 32, 30, 14));
        mealSets.add(createMealSet("虾仁炒西兰花", "Lunch", "Lose weight",
            "[{\"name\":\"虾仁\",\"amount\":\"150g\"},{\"name\":\"西兰花\",\"amount\":\"150g\"},{\"name\":\"糙米饭\",\"amount\":\"80g\"}]",
            400, 35, 38, 8));
        mealSets.add(createMealSet("豆腐蔬菜汤配杂粮饭", "Lunch", "Lose weight",
            "[{\"name\":\"豆腐\",\"amount\":\"200g\"},{\"name\":\"菌菇\",\"amount\":\"100g\"},{\"name\":\"杂粮饭\",\"amount\":\"100g\"}]",
            360, 20, 45, 10));
        mealSets.add(createMealSet("三文鱼寿司卷", "Lunch", "Lose weight",
            "[{\"name\":\"三文鱼\",\"amount\":\"100g\"},{\"name\":\"寿司米\",\"amount\":\"100g\"},{\"name\":\"海苔\",\"amount\":\"2张\"},{\"name\":\"黄瓜\",\"amount\":\"50g\"}]",
            430, 28, 50, 12));
        mealSets.add(createMealSet("番茄牛腩汤配面条", "Lunch", "Lose weight",
            "[{\"name\":\"牛腩\",\"amount\":\"100g\"},{\"name\":\"番茄\",\"amount\":\"2个\"},{\"name\":\"全麦面条\",\"amount\":\"80g\"}]",
            410, 30, 42, 12));

        // ========== 减脂套餐 - 晚餐 ==========
        mealSets.add(createMealSet("清炒时蔬配豆腐", "Dinner", "Lose weight",
            "[{\"name\":\"豆腐\",\"amount\":\"150g\"},{\"name\":\"青菜\",\"amount\":\"200g\"},{\"name\":\"木耳\",\"amount\":\"50g\"}]",
            280, 18, 20, 14));
        mealSets.add(createMealSet("蒸蛋配蔬菜", "Dinner", "Lose weight",
            "[{\"name\":\"鸡蛋\",\"amount\":\"2个\"},{\"name\":\"胡萝卜\",\"amount\":\"50g\"},{\"name\":\"豌豆\",\"amount\":\"30g\"}]",
            220, 14, 12, 14));
        mealSets.add(createMealSet("鸡肉蔬菜汤", "Dinner", "Lose weight",
            "[{\"name\":\"鸡胸肉\",\"amount\":\"100g\"},{\"name\":\"白菜\",\"amount\":\"100g\"},{\"name\":\"豆腐\",\"amount\":\"50g\"}]",
            250, 28, 10, 12));
        mealSets.add(createMealSet("凉拌海带丝配粥", "Dinner", "Lose weight",
            "[{\"name\":\"海带\",\"amount\":\"100g\"},{\"name\":\"小米粥\",\"amount\":\"200ml\"},{\"name\":\"咸菜\",\"amount\":\"20g\"}]",
            200, 6, 38, 2));
        mealSets.add(createMealSet("蒜蓉西兰花配鸡蛋", "Dinner", "Lose weight",
            "[{\"name\":\"西兰花\",\"amount\":\"200g\"},{\"name\":\"鸡蛋\",\"amount\":\"2个\"},{\"name\":\"大蒜\",\"amount\":\"10g\"}]",
            260, 18, 15, 16));
        mealSets.add(createMealSet("番茄鸡蛋面", "Dinner", "Lose weight",
            "[{\"name\":\"番茄\",\"amount\":\"2个\"},{\"name\":\"鸡蛋\",\"amount\":\"2个\"},{\"name\":\"面条\",\"amount\":\"60g\"}]",
            320, 16, 40, 10));
        mealSets.add(createMealSet("清蒸鱼片配青菜", "Dinner", "Lose weight",
            "[{\"name\":\"龙利鱼\",\"amount\":\"150g\"},{\"name\":\"油菜\",\"amount\":\"150g\"},{\"name\":\"姜丝\",\"amount\":\"5g\"}]",
            240, 30, 8, 10));

        // ========== 增肌套餐 - 早餐 ==========
        mealSets.add(createMealSet("蛋白质燕麦碗", "Breakfast", "Build muscle",
            "[{\"name\":\"燕麦\",\"amount\":\"80g\"},{\"name\":\"蛋白粉\",\"amount\":\"30g\"},{\"name\":\"香蕉\",\"amount\":\"1根\"},{\"name\":\"花生酱\",\"amount\":\"20g\"}]",
            520, 35, 60, 18));
        mealSets.add(createMealSet("培根鸡蛋配全麦面包", "Breakfast", "Build muscle",
            "[{\"name\":\"培根\",\"amount\":\"3片\"},{\"name\":\"鸡蛋\",\"amount\":\"3个\"},{\"name\":\"全麦面包\",\"amount\":\"2片\"}]",
            580, 38, 35, 32));
        mealSets.add(createMealSet("牛奶蛋白奶昔", "Breakfast", "Build muscle",
            "[{\"name\":\"全脂牛奶\",\"amount\":\"400ml\"},{\"name\":\"香蕉\",\"amount\":\"1根\"},{\"name\":\"蛋白粉\",\"amount\":\"30g\"},{\"name\":\"燕麦\",\"amount\":\"30g\"}]",
            550, 40, 55, 16));
        mealSets.add(createMealSet("鸡蛋炒饭", "Breakfast", "Build muscle",
            "[{\"name\":\"米饭\",\"amount\":\"200g\"},{\"name\":\"鸡蛋\",\"amount\":\"3个\"},{\"name\":\"火腿\",\"amount\":\"50g\"},{\"name\":\"青豆\",\"amount\":\"30g\"}]",
            620, 28, 70, 22));
        mealSets.add(createMealSet("芝士蛋卷配吐司", "Breakfast", "Build muscle",
            "[{\"name\":\"鸡蛋\",\"amount\":\"3个\"},{\"name\":\"芝士\",\"amount\":\"30g\"},{\"name\":\"吐司\",\"amount\":\"2片\"},{\"name\":\"牛奶\",\"amount\":\"200ml\"}]",
            560, 32, 40, 30));
        mealSets.add(createMealSet("牛肉粥配鸡蛋", "Breakfast", "Build muscle",
            "[{\"name\":\"牛肉糜\",\"amount\":\"80g\"},{\"name\":\"大米\",\"amount\":\"80g\"},{\"name\":\"鸡蛋\",\"amount\":\"2个\"}]",
            500, 35, 50, 18));
        mealSets.add(createMealSet("三明治配酸奶", "Breakfast", "Build muscle",
            "[{\"name\":\"全麦面包\",\"amount\":\"3片\"},{\"name\":\"鸡胸肉\",\"amount\":\"80g\"},{\"name\":\"芝士\",\"amount\":\"2片\"},{\"name\":\"酸奶\",\"amount\":\"150g\"}]",
            540, 38, 48, 20));

        // ========== 增肌套餐 - 午餐 ==========
        mealSets.add(createMealSet("牛排配土豆泥", "Lunch", "Build muscle",
            "[{\"name\":\"牛排\",\"amount\":\"250g\"},{\"name\":\"土豆泥\",\"amount\":\"150g\"},{\"name\":\"西兰花\",\"amount\":\"100g\"}]",
            750, 55, 50, 35));
        mealSets.add(createMealSet("鸡腿饭配蔬菜", "Lunch", "Build muscle",
            "[{\"name\":\"鸡腿\",\"amount\":\"2个\"},{\"name\":\"米饭\",\"amount\":\"200g\"},{\"name\":\"炒青菜\",\"amount\":\"150g\"}]",
            720, 48, 65, 28));
        mealSets.add(createMealSet("三文鱼配意面", "Lunch", "Build muscle",
            "[{\"name\":\"三文鱼\",\"amount\":\"200g\"},{\"name\":\"意面\",\"amount\":\"150g\"},{\"name\":\"奶油酱\",\"amount\":\"30g\"}]",
            780, 45, 70, 32));
        mealSets.add(createMealSet("红烧肉配米饭", "Lunch", "Build muscle",
            "[{\"name\":\"五花肉\",\"amount\":\"150g\"},{\"name\":\"米饭\",\"amount\":\"200g\"},{\"name\":\"青菜\",\"amount\":\"100g\"}]",
            800, 35, 70, 42));
        mealSets.add(createMealSet("烤鸡胸配薯条", "Lunch", "Build muscle",
            "[{\"name\":\"鸡胸肉\",\"amount\":\"200g\"},{\"name\":\"薯条\",\"amount\":\"150g\"},{\"name\":\"蔬菜沙拉\",\"amount\":\"100g\"}]",
            700, 52, 55, 30));
        mealSets.add(createMealSet("牛肉面", "Lunch", "Build muscle",
            "[{\"name\":\"牛肉\",\"amount\":\"150g\"},{\"name\":\"面条\",\"amount\":\"200g\"},{\"name\":\"青菜\",\"amount\":\"50g\"},{\"name\":\"鸡蛋\",\"amount\":\"1个\"}]",
            730, 45, 80, 25));
        mealSets.add(createMealSet("猪排饭", "Lunch", "Build muscle",
            "[{\"name\":\"猪排\",\"amount\":\"200g\"},{\"name\":\"米饭\",\"amount\":\"200g\"},{\"name\":\"卷心菜\",\"amount\":\"80g\"},{\"name\":\"味噌汤\",\"amount\":\"200ml\"}]",
            760, 42, 75, 32));

        // ========== 增肌套餐 - 晚餐 ==========
        mealSets.add(createMealSet("烤鸡配蔬菜", "Dinner", "Build muscle",
            "[{\"name\":\"鸡腿肉\",\"amount\":\"200g\"},{\"name\":\"烤蔬菜\",\"amount\":\"200g\"},{\"name\":\"橄榄油\",\"amount\":\"10g\"}]",
            480, 42, 20, 28));
        mealSets.add(createMealSet("牛肉炒饭", "Dinner", "Build muscle",
            "[{\"name\":\"牛肉\",\"amount\":\"150g\"},{\"name\":\"米饭\",\"amount\":\"150g\"},{\"name\":\"蔬菜\",\"amount\":\"100g\"}]",
            520, 38, 50, 20));
        mealSets.add(createMealSet("三文鱼配糙米", "Dinner", "Build muscle",
            "[{\"name\":\"三文鱼\",\"amount\":\"180g\"},{\"name\":\"糙米饭\",\"amount\":\"120g\"},{\"name\":\"芦笋\",\"amount\":\"100g\"}]",
            550, 40, 45, 22));
        mealSets.add(createMealSet("猪里脊配土豆", "Dinner", "Build muscle",
            "[{\"name\":\"猪里脊\",\"amount\":\"200g\"},{\"name\":\"土豆\",\"amount\":\"150g\"},{\"name\":\"西兰花\",\"amount\":\"100g\"}]",
            500, 45, 35, 20));
        mealSets.add(createMealSet("鸡肉意面", "Dinner", "Build muscle",
            "[{\"name\":\"鸡胸肉\",\"amount\":\"150g\"},{\"name\":\"意面\",\"amount\":\"120g\"},{\"name\":\"番茄酱\",\"amount\":\"50g\"}]",
            480, 40, 55, 12));
        mealSets.add(createMealSet("虾仁炒饭", "Dinner", "Build muscle",
            "[{\"name\":\"虾仁\",\"amount\":\"150g\"},{\"name\":\"米饭\",\"amount\":\"150g\"},{\"name\":\"鸡蛋\",\"amount\":\"2个\"},{\"name\":\"青豆\",\"amount\":\"30g\"}]",
            520, 38, 52, 18));
        mealSets.add(createMealSet("牛排配薯泥", "Dinner", "Build muscle",
            "[{\"name\":\"牛排\",\"amount\":\"180g\"},{\"name\":\"土豆泥\",\"amount\":\"100g\"},{\"name\":\"玉米\",\"amount\":\"50g\"}]",
            560, 48, 35, 26));

        // ========== 保持健康套餐 - 早餐 ==========
        mealSets.add(createMealSet("杂粮粥配小菜", "Breakfast", "Keep fit",
            "[{\"name\":\"杂粮\",\"amount\":\"50g\"},{\"name\":\"咸菜\",\"amount\":\"20g\"},{\"name\":\"鸡蛋\",\"amount\":\"1个\"}]",
            320, 14, 48, 8));
        mealSets.add(createMealSet("豆浆油条", "Breakfast", "Keep fit",
            "[{\"name\":\"豆浆\",\"amount\":\"300ml\"},{\"name\":\"油条\",\"amount\":\"1根\"},{\"name\":\"茶叶蛋\",\"amount\":\"1个\"}]",
            380, 15, 42, 16));
        mealSets.add(createMealSet("包子配粥", "Breakfast", "Keep fit",
            "[{\"name\":\"肉包子\",\"amount\":\"2个\"},{\"name\":\"白粥\",\"amount\":\"200ml\"},{\"name\":\"咸蛋\",\"amount\":\"半个\"}]",
            420, 16, 55, 14));
        mealSets.add(createMealSet("面条配煎蛋", "Breakfast", "Keep fit",
            "[{\"name\":\"面条\",\"amount\":\"100g\"},{\"name\":\"煎蛋\",\"amount\":\"1个\"},{\"name\":\"青菜\",\"amount\":\"50g\"}]",
            360, 14, 50, 12));
        mealSets.add(createMealSet("馒头配豆腐脑", "Breakfast", "Keep fit",
            "[{\"name\":\"馒头\",\"amount\":\"1个\"},{\"name\":\"豆腐脑\",\"amount\":\"200ml\"},{\"name\":\"咸菜\",\"amount\":\"20g\"}]",
            340, 12, 52, 8));
        mealSets.add(createMealSet("鸡蛋饼配牛奶", "Breakfast", "Keep fit",
            "[{\"name\":\"鸡蛋饼\",\"amount\":\"1张\"},{\"name\":\"牛奶\",\"amount\":\"250ml\"},{\"name\":\"苹果\",\"amount\":\"1个\"}]",
            400, 18, 48, 14));
        mealSets.add(createMealSet("燕麦片配水果", "Breakfast", "Keep fit",
            "[{\"name\":\"燕麦片\",\"amount\":\"50g\"},{\"name\":\"牛奶\",\"amount\":\"200ml\"},{\"name\":\"草莓\",\"amount\":\"50g\"}]",
            350, 14, 50, 10));

        // ========== 保持健康套餐 - 午餐 ==========
        mealSets.add(createMealSet("家常炒菜配米饭", "Lunch", "Keep fit",
            "[{\"name\":\"青椒炒肉\",\"amount\":\"150g\"},{\"name\":\"米饭\",\"amount\":\"150g\"},{\"name\":\"紫菜蛋花汤\",\"amount\":\"200ml\"}]",
            550, 25, 60, 22));
        mealSets.add(createMealSet("红烧茄子配米饭", "Lunch", "Keep fit",
            "[{\"name\":\"茄子\",\"amount\":\"200g\"},{\"name\":\"米饭\",\"amount\":\"150g\"},{\"name\":\"豆腐汤\",\"amount\":\"200ml\"}]",
            480, 15, 65, 18));
        mealSets.add(createMealSet("宫保鸡丁配米饭", "Lunch", "Keep fit",
            "[{\"name\":\"鸡丁\",\"amount\":\"150g\"},{\"name\":\"花生\",\"amount\":\"30g\"},{\"name\":\"米饭\",\"amount\":\"150g\"}]",
            580, 32, 55, 24));
        mealSets.add(createMealSet("麻婆豆腐配米饭", "Lunch", "Keep fit",
            "[{\"name\":\"豆腐\",\"amount\":\"200g\"},{\"name\":\"肉末\",\"amount\":\"50g\"},{\"name\":\"米饭\",\"amount\":\"150g\"}]",
            520, 22, 58, 20));
        mealSets.add(createMealSet("西红柿炒蛋配米饭", "Lunch", "Keep fit",
            "[{\"name\":\"西红柿\",\"amount\":\"2个\"},{\"name\":\"鸡蛋\",\"amount\":\"2个\"},{\"name\":\"米饭\",\"amount\":\"150g\"}]",
            480, 18, 60, 16));
        mealSets.add(createMealSet("糖醋里脊配米饭", "Lunch", "Keep fit",
            "[{\"name\":\"猪里脊\",\"amount\":\"150g\"},{\"name\":\"米饭\",\"amount\":\"150g\"},{\"name\":\"蔬菜汤\",\"amount\":\"200ml\"}]",
            560, 28, 60, 22));
        mealSets.add(createMealSet("鱼香肉丝配米饭", "Lunch", "Keep fit",
            "[{\"name\":\"猪肉丝\",\"amount\":\"120g\"},{\"name\":\"木耳\",\"amount\":\"50g\"},{\"name\":\"米饭\",\"amount\":\"150g\"}]",
            540, 26, 58, 20));

        // ========== 保持健康套餐 - 晚餐 ==========
        mealSets.add(createMealSet("清炒时蔬配米饭", "Dinner", "Keep fit",
            "[{\"name\":\"时蔬\",\"amount\":\"200g\"},{\"name\":\"米饭\",\"amount\":\"100g\"},{\"name\":\"鸡蛋汤\",\"amount\":\"200ml\"}]",
            350, 12, 50, 10));
        mealSets.add(createMealSet("蒸饺配小菜", "Dinner", "Keep fit",
            "[{\"name\":\"蒸饺\",\"amount\":\"8个\"},{\"name\":\"凉拌黄瓜\",\"amount\":\"100g\"}]",
            400, 16, 52, 14));
        mealSets.add(createMealSet("炒面配蔬菜", "Dinner", "Keep fit",
            "[{\"name\":\"炒面\",\"amount\":\"150g\"},{\"name\":\"青菜\",\"amount\":\"100g\"},{\"name\":\"鸡蛋\",\"amount\":\"1个\"}]",
            420, 16, 55, 14));
        mealSets.add(createMealSet("排骨汤配米饭", "Dinner", "Keep fit",
            "[{\"name\":\"排骨\",\"amount\":\"100g\"},{\"name\":\"萝卜\",\"amount\":\"100g\"},{\"name\":\"米饭\",\"amount\":\"100g\"}]",
            450, 22, 45, 18));
        mealSets.add(createMealSet("凉拌三丝配馒头", "Dinner", "Keep fit",
            "[{\"name\":\"黄瓜丝\",\"amount\":\"80g\"},{\"name\":\"胡萝卜丝\",\"amount\":\"50g\"},{\"name\":\"粉丝\",\"amount\":\"50g\"},{\"name\":\"馒头\",\"amount\":\"1个\"}]",
            320, 8, 55, 6));
        mealSets.add(createMealSet("蛋炒饭配汤", "Dinner", "Keep fit",
            "[{\"name\":\"米饭\",\"amount\":\"150g\"},{\"name\":\"鸡蛋\",\"amount\":\"2个\"},{\"name\":\"蔬菜汤\",\"amount\":\"200ml\"}]",
            380, 16, 48, 14));
        mealSets.add(createMealSet("饺子配蒜泥", "Dinner", "Keep fit",
            "[{\"name\":\"饺子\",\"amount\":\"12个\"},{\"name\":\"蒜泥\",\"amount\":\"10g\"},{\"name\":\"醋\",\"amount\":\"5ml\"}]",
            400, 18, 50, 14));

        // 保存所有套餐
        mealSetRepository.saveAll(mealSets);
        log.info("✅ 套餐库初始化完成，共导入 {} 个套餐", mealSets.size());
    }

    private FoodItem createFood(String name, String nameEn, String category,
                                 int calories, double protein, double carbs, double fat,
                                 String servingSize, double servingWeight, String keywords) {
        FoodItem food = new FoodItem();
        food.setName(name);
        food.setNameEn(nameEn);
        food.setCategory(category);
        food.setCalories(calories);
        food.setProtein(protein);
        food.setCarbs(carbs);
        food.setFat(fat);
        food.setServingSize(servingSize);
        food.setServingWeight(servingWeight);
        food.setKeywords(keywords);
        food.setEnabled(true);
        return food;
    }

    private MealSet createMealSet(String name, String mealType, String goalType,
                                   String ingredients, int calories, int protein, int carbs, int fat) {
        MealSet mealSet = new MealSet();
        mealSet.setName(name);
        mealSet.setMealType(mealType);
        mealSet.setGoalType(goalType);
        mealSet.setIngredients(ingredients);
        mealSet.setCalories(calories);
        mealSet.setProtein(protein);
        mealSet.setCarbs(carbs);
        mealSet.setFat(fat);
        mealSet.setEnabled(true);
        return mealSet;
    }
}
