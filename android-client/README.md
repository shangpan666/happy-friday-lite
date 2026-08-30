# Happy Friday 安卓端（企业内网版）

安卓 App，连接电脑端的 **Happy Friday Lite** 服务（`shareServer`，默认端口 `17918`），
通过**账号令牌**登录，按账号读取电脑端的笔记与全部对话。同一账号即可在手机上看到电脑端数据。

> 技术栈：Flutter（Dart）。对应电脑端改动：`src-electron/db.js`、`src-electron/shareServer.js`。

---

## 一、电脑端需要做什么（一次）

1. 启动 Happy Friday Lite（桌面端）。分享服务会自动在 `0.0.0.0:17918` 启动。
2. 首次启动会**自动创建主账号**：
   - 默认账号：`admin` / 密码：`change-me-now`
   - 可通过环境变量覆盖（正式部署务必修改）：
     ```
     HAPPY_FRIDAY_ADMIN_USER=admin
     HAPPY_FRIDAY_ADMIN_PASSWORD='至少8位的强密码'
     ```
3. 既有笔记/对话会自动归属到该主账号（设备绑定），手机用**同一账号**登录即可看到。
4. 管理员可在 App 登录后调用 `POST /api/auth/register`（需管理员令牌）创建员工账号，
   员工账号之间数据互相隔离，只能看到自己的数据。

### 新增的接口
- `POST /api/auth/login` `{username,password}` → 返回 `token`（Bearer）
- `GET  /api/auth/me` → 当前账号信息
- `POST /api/auth/register`（管理员）→ 创建员工账号
- 以下接口**全部需要 `Authorization: Bearer <token>`**（未携带返回 401）：
  - `GET  /api/mobile/notes`
  - `GET  /api/mobile/note/:id`
  - `GET  /api/mobile/notes/search?q=`
  - `GET  /api/mobile/sessions`
  - `GET  /api/mobile/session/:id`
  - `POST /api/mobile/chat` `{message, sessionId?}`

---

## 二、构建安卓 App

需要本机安装 [Flutter SDK](https://flutter.dev)（≥3.3）和 Android SDK。

```bash
cd android-client

# 1) 生成原生工程（会保留 lib/ 与 pubspec.yaml，仅补齐 android 原生脚手架与 local.properties）
flutter create .

# 2) 安装依赖
flutter pub get

# 3) 构建 release APK
flutter build apk --release
# 产物：build/app/outputs/flutter-apk/app-release.apk
```

> 说明：`flutter create .` 会重新生成 `android/app/src/main/AndroidManifest.xml` 等原生文件。
> 请**用本项目提供的 AndroidManifest.xml 覆盖**（已包含 `INTERNET` 权限、明文 HTTP 允许、
> `network_security_config`，否则连不上内网 HTTP 服务），并保留
> `android/app/src/main/res/xml/network_security_config.xml` 与
> `android/app/src/main/res/drawable/ic_launcher.xml`。

### 直接运行（调试）
```bash
flutter run
```

---

## 三、使用

1. 打开 App，输入电脑端地址（如 `http://192.168.1.20:17918`）、账号、密码，登录。
2. 登录后进入「笔记 / 对话」标签页：
   - 笔记：列表 → 详情（与电脑端同一账号的数据）。
   - 对话：列表 → 会话详情，可在底部输入框直接给电脑端 Friday 发消息，
     回复会出现在手机与电脑端（数据归属当前账号）。
3. 右上角可刷新 / 退出登录。

---

## 四、安全说明（企业内网）

- 传输：当前按你的要求使用 **HTTP 明文**（仅限内网）。若需防窃听/防中间人，
  电脑端启用 HTTPS 并将 App 地址改为 `https://` 即可（已支持自签证书）。
- 认证：所有 `/api/mobile/*` 接口都需要 Bearer Token；密码使用 scrypt 加盐哈希存储。
- 隔离：数据按 `account_id` 隔离，员工账号无法读取他人数据；主账号拥有本机全部数据。
- 设备绑定：账号在创建时绑定到当前 PC 的 `device_id`，返回给 App 显示。
- 上线前务必修改默认管理员密码，并限制 `17918` 端口只在公司内网可达。
- 分享链接接口 `/api/share/*` 为只读且未鉴权（历史功能），如不需要可在防火墙关闭 17918 对外暴露。
