/**
 * 版本号管理脚本
 * 用法：
 *   node scripts/bumpVersion.js patch   # 1.0.0 -> 1.0.1 (Bug修复)
 *   node scripts/bumpVersion.js minor   # 1.0.0 -> 1.1.0 (新功能)
 *   node scripts/bumpVersion.js major   # 1.0.0 -> 2.0.0 (大版本更新)
 *   node scripts/bumpVersion.js 1.2.3   # 直接设置版本号
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');

function bumpVersion(type) {
  // 读取 app.json
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  const currentVersion = appJson.expo.version;
  const currentVersionCode = appJson.expo.android?.versionCode || 1;
  const currentBuildNumber = appJson.expo.ios?.buildNumber || '1';
  
  console.log(`\n📱 当前版本信息:`);
  console.log(`   版本号 (version): ${currentVersion}`);
  console.log(`   Android versionCode: ${currentVersionCode}`);
  console.log(`   iOS buildNumber: ${currentBuildNumber}`);
  
  let newVersion;
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // 判断是否是直接指定版本号
  if (/^\d+\.\d+\.\d+$/.test(type)) {
    newVersion = type;
  } else {
    switch (type) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
      default:
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }
  }
  
  // 更新版本号
  appJson.expo.version = newVersion;
  
  // Android versionCode 自动递增
  appJson.expo.android.versionCode = currentVersionCode + 1;
  
  // iOS buildNumber 也更新
  appJson.expo.ios.buildNumber = newVersion;
  
  // 写入文件
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  
  console.log(`\n✅ 版本已更新:`);
  console.log(`   版本号 (version): ${currentVersion} → ${newVersion}`);
  console.log(`   Android versionCode: ${currentVersionCode} → ${appJson.expo.android.versionCode}`);
  console.log(`   iOS buildNumber: ${currentBuildNumber} → ${newVersion}`);
  console.log(`\n📦 现在可以运行构建命令:`);
  console.log(`   eas build -p android --profile preview    # 测试版 APK`);
  console.log(`   eas build -p android --profile production # 生产版 AAB`);
  console.log('');
}

const type = process.argv[2] || 'patch';
bumpVersion(type);

