const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// FitBitePal 图标 - 健身+饮食主题
// 设计：渐变背景 + 哑铃和苹果的组合图形

const createIcon = async (size, outputPath) => {
  // SVG 图标设计
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 渐变背景 - 活力橙到健康绿 -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FF8C42;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2ECC71;stop-opacity:1" />
    </linearGradient>
    <!-- 白色图形阴影 -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="15" flood-color="#000" flood-opacity="0.2"/>
    </filter>
  </defs>
  
  <!-- 圆角背景 -->
  <rect x="0" y="0" width="1024" height="1024" rx="220" ry="220" fill="url(#bgGradient)"/>
  
  <!-- 主图形组 -->
  <g filter="url(#shadow)">
    <!-- 哑铃 - 代表健身 -->
    <!-- 左侧重量片 -->
    <rect x="180" y="380" width="100" height="264" rx="20" fill="white"/>
    <!-- 右侧重量片 -->
    <rect x="744" y="380" width="100" height="264" rx="20" fill="white"/>
    <!-- 哑铃杆 -->
    <rect x="260" y="470" width="504" height="84" rx="42" fill="white"/>
    
    <!-- 苹果/心形叶子 - 代表健康饮食 -->
    <!-- 苹果主体（放在哑铃中间偏上） -->
    <ellipse cx="512" cy="420" rx="90" ry="100" fill="white"/>
    <!-- 苹果叶子 -->
    <path d="M512 320 Q550 280 530 340 Q512 360 512 320" fill="#2ECC71" stroke="#27AE60" stroke-width="3"/>
    <!-- 苹果茎 -->
    <rect x="506" y="320" width="12" height="40" rx="6" fill="#8B4513"/>
    
    <!-- 心跳线/脉搏 - 代表活力 -->
    <path d="M320 512 L420 512 L450 440 L490 580 L530 440 L570 580 L600 512 L700 512" 
          stroke="#FF6B35" stroke-width="20" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  
  <!-- 底部文字装饰线 -->
  <rect x="312" y="750" width="400" height="8" rx="4" fill="white" opacity="0.8"/>
</svg>
`;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`✅ 已生成: ${outputPath} (${size}x${size})`);
};

// 创建更简洁的设计
const createSimpleIcon = async (size, outputPath) => {
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 渐变背景 - 现代活力感 -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f093fb"/>
      <stop offset="100%" style="stop-color:#f5576c"/>
    </linearGradient>
  </defs>
  
  <!-- 圆角背景 -->
  <rect x="0" y="0" width="1024" height="1024" rx="200" fill="url(#bg)"/>
  
  <!-- 字母 F 和 P 组合设计 -->
  <g transform="translate(512, 512)">
    <!-- 外圆环 -->
    <circle cx="0" cy="0" r="340" fill="none" stroke="white" stroke-width="40" opacity="0.3"/>
    
    <!-- 中心图形 - 火焰/能量符号 -->
    <path d="M0 -200 
             Q80 -100 60 0 
             Q100 -50 80 50
             Q120 0 100 100
             Q60 60 0 200
             Q-60 60 -100 100
             Q-120 0 -80 50
             Q-100 -50 -60 0
             Q-80 -100 0 -200Z" 
          fill="url(#accent)"/>
    
    <!-- 心形 - 代表健康 -->
    <path d="M0 80 
             C-60 20 -100 -40 -60 -100
             C-20 -160 40 -140 0 -60
             C-40 -140 20 -160 60 -100
             C100 -40 60 20 0 80Z" 
          fill="white" transform="translate(0, 20) scale(0.8)"/>
  </g>
  
  <!-- FB 文字 -->
  <text x="512" y="880" font-family="Arial Black, Arial, sans-serif" font-size="100" 
        font-weight="bold" fill="white" text-anchor="middle" opacity="0.9">FitBite</text>
</svg>
`;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`✅ 已生成: ${outputPath} (${size}x${size})`);
};

// 创建最终版本 - 简洁现代风格
const createFinalIcon = async (size, outputPath) => {
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 主渐变 - 活力橙绿 -->
    <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF512F"/>
      <stop offset="100%" style="stop-color:#00B894"/>
    </linearGradient>
    <!-- 点缀渐变 -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF"/>
      <stop offset="100%" style="stop-color:#E8E8E8"/>
    </linearGradient>
  </defs>
  
  <!-- 圆角背景 -->
  <rect x="0" y="0" width="1024" height="1024" rx="220" fill="url(#mainGradient)"/>
  
  <!-- 装饰圆环 -->
  <circle cx="512" cy="480" r="300" fill="none" stroke="white" stroke-width="30" opacity="0.2"/>
  
  <!-- 主图形：结合哑铃+叉勺的抽象设计 -->
  <g fill="white">
    <!-- 中心六边形 -->
    <path d="M512 200 L680 320 L680 560 L512 680 L344 560 L344 320 Z" 
          fill="white" opacity="0.95"/>
    
    <!-- 闪电/能量符号 - 代表活力 -->
    <path d="M560 280 L480 440 L540 440 L460 600 L580 400 L520 400 L600 280 Z" 
          fill="url(#mainGradient)"/>
  </g>
  
  <!-- 底部品牌名 -->
  <text x="512" y="860" font-family="Arial, Helvetica, sans-serif" font-size="90" 
        font-weight="bold" fill="white" text-anchor="middle" letter-spacing="8">FitBite</text>
</svg>
`;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`✅ 已生成: ${outputPath} (${size}x${size})`);
};

const assetsDir = path.join(__dirname, '..', 'assets');

async function main() {
  console.log('🎨 正在生成 FitBitePal 应用图标...\n');
  
  try {
    // 生成主图标 (1024x1024)
    await createFinalIcon(1024, path.join(assetsDir, 'icon.png'));
    
    // 生成 Android 自适应图标 (1024x1024)
    await createFinalIcon(1024, path.join(assetsDir, 'adaptive-icon.png'));
    
    // 生成启动图标 (200x200 适合启动屏)
    await createFinalIcon(200, path.join(assetsDir, 'splash-icon.png'));
    
    // 生成 favicon (48x48)
    await createFinalIcon(48, path.join(assetsDir, 'favicon.png'));
    
    console.log('\n🎉 所有图标生成完成！');
    console.log('📁 图标位置: FitBitePal-Mobile/assets/');
  } catch (error) {
    console.error('❌ 生成图标时出错:', error);
  }
}

main();

