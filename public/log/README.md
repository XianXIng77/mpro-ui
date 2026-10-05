# 注册日志示例截图

沿用旧项目 `log/<注册目标>/<事件目录>/screenshot.png` 的组织方式。
此处位于前端 public 目录，供注册日志 UI 直接读取静态图片，暂不接入后端图片存储。

- `openai/demo-plus-trial/screenshot.png`：Plus 试用检查示例。
- `openai/demo-checkout-kind/screenshot.png`：Checkout 类型检测示例。
- `grok/demo-registration-error/screenshot.png`：注册错误示例。

图片为本地 HTML 演示界面的浏览器截图，不含真实账号或服务数据。
日志模拟数据位于 `src/mock/registration-logs.ts`，刷新仅重新加载该数据。
