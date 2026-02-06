# 🎨 01_Design_System.md (全局设计规范)

**适用范围：** 全平台 (Desktop/Mobile)
**核心原则：** 沉浸 (Immersive)、语义化 (Semantic)、极简 (Minimalist)

---

## 1. 布局框架 (Layout Framework)

### 1.1 桌面端 (Adaptive Layout)
采用了动静态结合的布局：
*   **Flow 模式 (Full Screen):** 单栏布局，正文居中。最大阅读宽度约 700px。无右侧面板干扰。
*   **Learn 模式 (Split Screen):** 6:4 分屏结构。
    *   **Left (60%): 阅读流 (Reader Stream)。** 背景色：`var(--bg-paper)`。衬线体，大行距。
    *   **Right (40%): 智能仪表盘 (Copilot Panel)。** 承载 X-Ray 分析和生词脚手架。背景色：`#F7F9FC`。

### 1.2 移动端 (Bottom Sheet) - 规划中
*   **正文：** 全屏显示。
*   **仪表盘：** 作为可拖拽的 **Bottom Sheet (底部抽屉)** 存在。

---

## 2. 视觉组件规范 (Visual Components)

### 2.1 视觉锚点：金色磁吸光标 (Magnetic Marker)
指示“当前关注的段落”的核心组件。

*   **形态：** 左侧边缘的垂直细条，宽度 `4px`。
*   **颜色：** 固定为金色 (`#D4AF37`)，具有呼吸阴影效果。
*   **交互逻辑：**
    *   **Scrolling (滚动中):** 自动识别视窗内最靠近阅读焦点 (约 40% 处) 的段落并吸附。
    *   **Clicking (点击):** 用户点击任一段落时，光标平滑移动跳转。

### 2.2 悬浮控制器 (Floating Controls)
*   **整合设计**: 包含模式切换 (Flow/Learn)、脚手架等级 (Lv1-3) 和导入入口。
*   **视觉**: 玻璃拟态 (Glassmorphism)，背景模糊，随鼠标靠近而展开，静止时收缩。

---

## 3. 主题色系统 (Color System)

| 模式 | 主题色 (`--theme-primary`) | 意义 |
| :--- | :--- | :--- |
| **☕️ Flow** | **Emerald Green** `#00B894` | 畅快、自然、沉浸 |
| **🎓 Learn** | **Royal Blue** `#2980B9` | 专业、严谨、沉稳 |

**辅助/强调色**:
*   `--accent-gold`: `#D4AF37` (用于磁吸条、高亮关键点)
*   `--accent-action`: `#5D3FD3` (用于按钮交互、AI 对话)

---

## 4. 字体排印 (Typography)

*   **阅读区 (Serif):** 极致阅读体验。
    *   **English**: `Lora`, `Merriweather`, `Charter`, Serif.
    *   **Chinese**: `PingFang SC`, `Microsoft YaHei`, Sans-serif (增加字重至 500 以增强辨识度).
    *   **Size**: 1.15rem ~ 1.4rem.
    *   **Line-height**: 1.9 (更加开阔的行间距).
*   **UI区 (Sans-Serif):** 清晰的信息传递。
    *   Font Family: `Outfit`, `Inter`, System UI.

---

## 5. 交互物理特性 (Interaction Physics)

*   **Transitions:**
    *   所有主题色与布局切换：`transition: flex 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s`.
    *   磁吸条移动：`transition: top 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)`.