# TabVault - Chrome 扩展程序

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文](README.zh.md)

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-v2.0.0-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension Manifest](https://img.shields.io/badge/Manifest-v3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![GitHub](https://img.shields.io/badge/GitHub-Open%20Source-lightgrey?logo=github)](https://github.com)
[![Security](https://img.shields.io/badge/Security-AES--256%20Encrypted-brightgreen.svg)](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
[![Sync](https://img.shields.io/badge/Sync-GitHub%20Gist-orange.svg)](https://gist.github.com)
[![Auto-Save](https://img.shields.io/badge/Auto--Save-1--60%20min-blue.svg)](https://developer.chrome.com/docs/extensions/)

一个强大的Chrome扩展程序，用于自动保存和恢复浏览器会话，支持跨设备同步。采用现代Web技术构建，专为无缝用户体验而设计。

**TabVault** - 标签页安全存储和跨设备同步的地方。名称结合了"Tab"（浏览器标签页）和"Vault"（安全存储），代表我们致力于保持您的浏览会话安全且可在任何地方访问的承诺。

## 概述
![Frame](https://github.com/user-attachments/assets/cdfc7b4a-3a77-4237-b3e9-8a0bbd0478bf)

TabVault以可配置的间隔自动保存您的浏览器会话，允许您稍后在不同设备上恢复它们。扩展程序使用GitHub Gist进行云同步，具有端到端加密，确保您的数据保持私密和安全。

**智能自动保存**默认每5分钟自动保存您的浏览器会话，但您可以将间隔调整为1到60分钟。**手动保存**让您通过一次点击或使用Ctrl+S键盘快捷键立即保存当前会话。

**跨设备同步**使用GitHub Gist无缝同步您的会话。所有数据在上传到云端之前都经过加密，当云同步不可用时，扩展程序会自动回退到本地存储。

## 主要功能

**会话管理**: 选择特定标签页或恢复整个会话。扩展程序支持批量操作，允许您选择多个会话进行批量删除或管理。

**高级过滤**: 按URL或标题搜索和过滤标签页，以便在大型会话集合中快速找到您要找的内容。

**安全性**: 所有会话数据在存储到云端之前都使用AES-256进行加密。当云同步不可用时，扩展程序完全离线工作并使用本地存储。

**实时状态**: 实时同步状态指示器、会话计数和存储使用量监控，提供即时反馈。

**键盘快捷键**: 使用Ctrl+S进行手动保存的快速访问，以及用于常见操作的自定义热键。

**会话预览**: 恢复前包含标签页缩略图和元数据的已保存会话的详细视图。

**智能清理**: 通过智能会话修剪和重复检测自动管理存储限制。

**跨浏览器支持**: 与Chrome、Chromium和Edge（基于Chromium）兼容，实现最大兼容性。

## 架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   弹出界面      │    │   后台脚本      │    │   内容脚本      │
│                 │    │                 │    │                 │
│ • 会话列表      │◄──►│                 │◄──►│                 │
│ • 设置          │    │ • 自动保存      │    │ • 标签页信息    │
│ • 同步状态      │    │ • 数据管理      │    │ • 页面访问      │
│ • 批量操作      │    │ • 加密          │    │ • 最小影响      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Chrome存储      │    │ GitHub Gist     │    │ 本地存储        │
│                 │    │                 │    │                 │
│ • 同步数据      │    │ • 云同步        │    │ • 离线模式      │
│ • 设置          │    │ • 加密          │    │ • 回退          │
│ • 会话缓存      │    │ • 版本管理      │    │ • 备份          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 安装方法

### 从Chrome Web Store
[Chrome Web store TabVault](https://chromewebstore.google.com/detail/tabvault-%EB%B3%B4%EC%95%88-%ED%83%AD-%EA%B4%80%EB%A6%AC%EC%9E%90/idilkfhikhppjciebljbfeejidkfalmd?authuser=0&hl=ko&pli=1)
1. 访问Chrome Web Store
2. 搜索"TabVault"
3. 点击"添加到Chrome"

### 手动安装
1. 下载扩展程序文件
2. 打开Chrome并导航到`chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"并选择扩展程序文件夹

## 开始使用

安装扩展程序后，您可以立即在本地模式下使用，无需任何配置。扩展程序将离线工作并在本地保存您的会话。对于跨设备同步，您需要配置GitHub同步，请按照以下步骤设置您的GitHub个人访问令牌：

### 设置GitHub个人访问令牌

1. **前往GitHub设置**
   - 访问[GitHub.com](https://github.com)并登录您的账户
   - 点击右上角的个人头像
   - 从下拉菜单中选择**Settings**

2. **访问开发者设置**
   - 滚动到左侧边栏的底部
   - 点击最底部的**Developer settings**

3. **创建个人访问令牌**
   - 在左侧边栏中点击**Personal access tokens**
   - 选择**Tokens (classic)**
   - 点击**Generate new token (classic)**

4. **配置令牌**
   - 为您的令牌指定一个描述性名称（例如："TabVault扩展程序"）
   - 根据需要设置过期时间（推荐：90天或自定义）
   - **重要**：仅勾选**gist**权限 - 这是扩展程序需要的全部
   - 点击**Generate token**

5. **复制并安全保管您的令牌**
   - **立即复制生成的令牌** - 您将无法再次看到它
   - 将其安全地存储在密码管理器或安全位置
   - **切勿公开分享此令牌** - 它提供对您的GitHub Gist的访问权限

6. **配置扩展程序**
   - 点击浏览器中的TabVault扩展程序图标
   - 转到**设置** → **GitHub配置**
   - 粘贴您的GitHub个人访问令牌
   - 点击**保存**完成设置

**⚠️ 安全警告**：请安全保管您的GitHub个人访问令牌，切勿公开分享。如果您意外泄露了令牌，请立即在GitHub设置中撤销它并生成新令牌。

### 使用扩展程序

**本地模式（默认）**：扩展程序在安装后无需任何配置即可立即工作。自动保存默认禁用 - 您可以在设置中启用它。所有会话都保存在您的设备本地。

**云同步模式**：设置GitHub令牌后，您可以启用自动保存和云同步。在设置中启用时，自动保存将以可配置的间隔（1-60分钟）保存您的会话。

要手动保存当前会话，只需在扩展程序弹出窗口中点击"立即保存"或按Ctrl+S。所有保存的会话都会出现在主界面中，您可以通过一次点击恢复它们。

## 配置

扩展程序使用GitHub Gist进行云同步，为每个用户提供专用的Gist进行会话存储。默认情况下每个账户最多存储20个会话，但这是可配置的。

自动保存设置允许您设置1到60分钟的间隔，当浏览器处于活动状态时触发。扩展程序自动管理存储限制并清理旧会话。

安全选项包括对所有云端数据的AES-256加密、本地模式下的完全离线操作以及安全的GitHub令牌存储。

## 技术详情

扩展程序架构由处理自动保存和数据管理的后台脚本、主用户界面的弹出界面以及具有最小占用空间且无页面注入的内容脚本组成。存储通过具有云同步功能的Chrome Storage API处理。

浏览器兼容性包括Chrome 88+、Chromium 88+和Edge 88+（基于Chromium）。

## 故障排除

如果自动保存不工作，请检查设置中是否启用，验证浏览器权限，并在Chrome DevTools中检查后台脚本。

对于同步问题，请验证您的GitHub令牌是否有效，检查您的互联网连接，并查看GitHub API速率限制。

如果会话没有出现，请尝试刷新扩展程序弹出窗口，在DevTools中检查本地存储，或验证GitHub Gist访问。

## 开发

要从源代码构建，请克隆存储库并将其作为未打包的扩展程序加载。由于使用纯JavaScript、HTML和CSS，因此不需要构建过程。

欢迎贡献。分叉存储库，创建功能分支，进行更改，彻底测试，并提交拉取请求。

## 许可证

此项目在MIT许可证下提供。详情请参阅[LICENSE](LICENSE)文件。

## 支持

在GitHub Issues上报告错误，加入社区讨论，或查看Wiki获取详细指南。

## 更新日志

**v2.0.0（当前）**
- 使用现代界面的完整UI重新设计
- 具有批量操作的增强会话管理
- 改进的GitHub Gist集成
- 添加云端数据加密
- 性能优化

**v1.0.0**
- 具有基本功能的初始版本
- 本地存储支持
- 手动保存/恢复功能

---

**TabVault** - 再也不会丢失您的浏览会话。 
