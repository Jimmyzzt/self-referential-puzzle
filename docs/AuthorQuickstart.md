# 出题与部署速查

在项目根目录用 PowerShell 或 VS Code 终端运行以下命令。题源只有 `src/content/chapter-n.puzzle.md`，不需要编辑 React 组件或另一份答案表。

## 写一道题

保留文件的 `# Chapter 3`，追加 `## Q3-8`；附加题可以用 `## Q3-A`。例题写作 `## Example 3-3`。内部小题仍写 `@question 1`、`@question 2`，从 1 连续编号。每小题都要有 A–E 五个选项。最后写 `@solution`，每个小题一个答案字母；例题另加 `@revealed`。

注释用 `<!-- 我的备注 -->`，可以跨行，也可以写在选项行末。普通 Markdown 段落不是注释，会被解析器拒绝。

第三章支持 `A`、`ref(2)`、`self` 直接比较字母，搭配字母选项内容；`#A`、`#ref(2)`、`#self` 比较数量，搭配整数内容。`ref(2)` 的 2 是本组内的小题号。

## 快速用求解器验证

```powershell
npm run puzzles:solve -- q3-8
npm run puzzles:solve -- e3-1
npm run puzzles:solve -- ch3
npm run puzzles:validate
```

选择器不区分大小写。`q3-a` 可以定位已添加的 Q3-A；`all` 可以检查整本书。

观察输出的 `solution(s)`：0 是无解，1 是唯一解，大于 1 是多解。解字符串从左到右对应本组的小题 1、2、3……。`puzzles:solve` 会展示实际结果，**它的退出成功不代表唯一解或声明正确**；`puzzles:validate` 才会要求所有题唯一解且与 `@solution`、`@revealed` 一致。声明不会参与求解，也不会限制候选答案。

第三章当前结果：Example 3-1 为 BC，Q3-1 为 AB，Q3-2 为 BAB，Example 3-2 为 BCC，Q3-3 为 CBE，Q3-4 为 CCD，Q3-5 为 AAC，Q3-6 为 DBBC，Q3-7 为 CCDDC。全部唯一解。

## 不运行程序，手算快速检查

先写出一串候选答案，再按这个顺序检查：

1. 每道小题只看**所选选项右侧的内容**，不要把选项标签与内容混为一谈。
2. `A` 的结果就是字母 A；`ref(n)` 的结果是第 n 小题选中的字母；`self` 是本题选中的字母。
3. 遇到 `#`，先取得目标字母，再统计它在整组答案中出现几次，包含本题。
4. 每道小题的表达式结果都必须等于所选选项的内容。五个 `?` 的小题不用做相等检查，但它的答案仍参与计数。

例如 Q3-5 的 AAC：第一题选 A，`ref(1)` 是 A，A 选项的内容也是 A；第二题选 A，`ref(1)` 仍是 A，A 选项内容也是 A；第三题选 C，`#ref(1)` 是 A 的数量 2，C 选项内容恰为 2。

这只验证了 AAC 可行。要手算唯一性，可从约束最强的小题缩小候选：Q3-5 第一题的自引用只允许 A 或 C；第二题的选项内容分别为 A–E，所以它必须与第一题同选。若前两题都是 C，第三题选 C 会让 C 的数量变成 3，但 C 选项写 2；第三题选其他字母时 C 的数量为 2，而那些选项分别写 0、1、3、4，均不等于 2。因此 CC 分支无解，只剩 AAC。

## 本地预览与发布

```powershell
npm test
npm run puzzles:validate
npm run build
npm run dev
```

打开终端打印的本地网址，切换章节，检查例题预选、字母/数量表达式和答案输入。用 Ctrl+C 停止预览。测试、验证、构建任一失败都应先修复再发布。

GitHub Pages 已配置为推送 `main` 自动发布。检查自己的改动后提交：

```powershell
git status
git diff
git add src/content docs
# 修改了实现时，也把对应的 src/puzzle、src/state 或 scripts 文件加入暂存。
git diff --cached
git commit -m "Add chapter 4 puzzles"
git push origin main
gh run list --workflow pages.yml --limit 3
```

`git add` 只暂存准备发布的文件。若没有安装 GitHub CLI，也可以打开仓库的 Actions 页面，查看 **Test and deploy Pages** 是否成功。成功后访问 <https://jimmyzzt.github.io/self-referential-puzzle/>。不用把 `dist/` 提交到 Git。

只在本地构建 Pages 子路径版本时：

```powershell
$env:VITE_BASE_PATH = '/self-referential-puzzle/'
npm run build
Remove-Item Env:VITE_BASE_PATH
```

itch.io 是另一项独立发布：

```powershell
npm run build:itch
```

把 `release/itch.zip` 上传到 itch.io 项目的编辑页面，作为 HTML 文件并启用浏览器游玩。GitHub Pages 更新不会自动更新 itch.io。
