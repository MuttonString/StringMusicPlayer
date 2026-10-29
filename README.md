# String 音乐播放器

一个现代风格的音乐播放器，基于 [Tauri](https://tauri.app/start/)，支持在线音乐。可添加自定义的在线音乐源。

## 特性

todo

## 安装

从 [Releases](https://github.com/MuttonString/string-music-player/releases) 下载

| 操作系统 | 架构                  | 文件          |
| -------- | --------------------- | ------------- |
| Windows  | x64 / ARM64           | `.exe`        |
| macOS    | Apple Silicon / Intel | `.dmg`        |
| Linux    | x64 / ARM64           | `.deb` `.rpm` |

## 开发

开发依赖：<https://tauri.app/start/prerequisites/>
应将 Pull Request 提交到 **dev** 分支。

将路径切换到项目目录下。
首次需运行：

```bash
npm i
```

然后运行：

```bash
npm run tauri dev
```

双击“设置 - 关于 - 应用程序版本”可启用开发者选项

## 资源文件

包括语言、在线音乐源。若想创建和上传自己的资源文件，参照：
<https://github.com/MuttonString/StringMusicResource>
