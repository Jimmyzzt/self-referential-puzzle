# 答题统计

三个正式站点（GitHub Pages、workers.dev、自定义域名）把 Check answers 事件写入同一个 Cloudflare D1 数据库。无需自己维护服务器。例题和未填完的题组不计入统计；每个 Q 题组以完整答案是否正确计一次。Worker 使用从题目源文件计算出的唯一解判分，不信任浏览器传来的正确标志。

## 查看数据

在已完成 `npx wrangler login` 的项目终端运行：

```powershell
npm run stats
npm run stats -- --overview
npm run stats -- --players
```

默认显示每道题在不同玩家分组中的首次提交正确率；`--overview` 显示每道题的总提交次数、匿名答题者数、所有提交正确率和首次提交正确率；`--players` 显示匿名答题者的整体首次提交正确率。添加 `--local` 查询本机开发数据库。

也可在 Cloudflare 控制台的 D1 → self-referential-puzzle-stats → Console 查询：

```sql
SELECT * FROM puzzle_cohort_stats ORDER BY puzzle_id, revision, cohort;
SELECT * FROM puzzle_stats ORDER BY puzzle_id, revision;
SELECT * FROM player_stats ORDER BY puzzles_attempted DESC;
```

没有玩家提交时，这些查询返回空表。CLI 将题目内容版本缩短显示为 12 位，数据库保存完整 SHA-256。

## 玩家分组和难度

`high_accuracy`：首次提交正确率至少 80%；`low_accuracy`：至多 50%；其余为 `middle`。至少提交过 8 道不同题才分类，否则为 `insufficient`。例题不参与。

分析某一道题时，以玩家在**其他题**的首次提交表现分组，排除当前题，避免“答对这题所以被分为高手”的循环。因此一位玩家至少还要做过 8 道其他题，才进入这题的有效水平分组。整体玩家表和按题分组的样本数可能不同。

这些是高/低正确率玩家的代理指标，不等同于客观高手/新手身份。分组按目前全部已收集数据回溯计算，包含玩家后来提交的其他题；它衡量总体表现，不代表提交当时的熟练程度。建议同时看样本量、首次正确率和总提交次数，少量样本不宜直接判定难度。

“首次”指服务器最先收到的检查；离线队列可能改变实际作答的先后。更改题目后按内容版本分开统计首次提交，但整体熟练度对同一题号只计算最早版本一次，避免重复版本抬高做题数量。改版前的练习经历仍可能影响改版后的表现。

## 匿名与可靠性

浏览器为每个站点生成随机 ID，存入 localStorage；数据库不保存姓名、邮箱、IP 或提交的具体答案，仅保存 ID、事件、题号、内容版本、正误及接收时间。Cloudflare 平台可能产生常规服务日志，它们与 D1 答题表不同。

同一人换设备、清理浏览器数据，或从 Pages 换到自定义域名，会得到另一个 ID。跨域数据汇入同一数据库，并不等于跨域自动识别同一个人。重复检查算新的尝试；网络重试沿用事件 ID，不重复计数。About 中可以关闭匿名统计并清空待发送队列。

网络失败不影响判题。待发送事件保存在本机，最多 100 个；下次检查、重新加载或恢复网络时重试。请求限量、校验结构、CORS 白名单和服务器判分减少错误数据，但公开匿名接口无法保证统计不被人为提交污染。

## 免费额度

按 [D1 官方价格](https://developers.cloudflare.com/d1/platform/pricing/)，Workers Free 包含每天 500 万行读取、10 万行写入、共 5 GB 存储。免费套餐超额会拒绝查询，不自动转成付费套餐。这里的单位是数据库行，不是点击次数；一条检查包含多道题、索引和事件记录，会写入多行。

[Workers Free](https://developers.cloudflare.com/workers/platform/pricing/) 另有每天 10 万次动态请求额度；静态资产请求免费。日志和 tracing 有独立额度及定价，配置中采用 1% 抽样。没有在本次配置中购买或升级任何套餐；账号原有套餐请在控制台确认。若账号已经使用 Paid 套餐，超出其包含额度可能收费。D1 Metrics 可以查看实际读写和存储量。
