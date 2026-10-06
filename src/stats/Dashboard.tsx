import { useEffect, useState } from 'react';
import { DEFAULT_STATS_ENDPOINT, STATS_ORIGINS } from './protocol';
import { percentage, puzzleLink, ratio, type Counts, type PuzzleStats, type StatsSnapshot } from './analysis';

const bookUrl = new URL(location.pathname.replace(/\/stats(?:\/index\.html)?\/?$/, '/') || '/', location.origin).href;
type Metric = 'both' | 'first' | 'all' | 'solved';
type Group = 'all' | 'compare' | 'high' | 'ordinary' | 'insufficient';
const metricNames = { first: '首次提交正确率', all: '总提交正确率', solved: '最终解出率' };
const groupNames = { all: '所有玩家', high: '高正确率玩家', ordinary: '普通玩家', insufficient: '样本不足玩家' };
function countsFor(puzzle: PuzzleStats, group: Exclude<Group, 'compare'>): Counts {
  return group === 'all' ? puzzle.counts : puzzle.cohorts[group];
}
function metricValue(counts: Counts, metric: Exclude<Metric, 'both'>): number | null {
  return metric === 'all' ? ratio(counts.correctChecks, counts.checks)
    : metric === 'solved' ? ratio(counts.solved, counts.players) : ratio(counts.firstCorrect, counts.players);
}
function number(value: number): string { return value.toLocaleString('zh-CN'); }
function average(total: number, players: number): string { return players ? (total / players).toFixed(1) : '—'; }

function AccuracyChart({ puzzles, group, metric }: { puzzles: PuzzleStats[]; group: Group; metric: Metric }) {
  const [active, setActive] = useState<string | null>(null);
  const groups: Exclude<Group, 'compare'>[] = group === 'compare' ? ['high', 'ordinary'] : [group];
  const metrics: Exclude<Metric, 'both'>[] = metric === 'both' ? ['first', 'all'] : [metric];
  const colors = ['#276651', '#a35e36', '#496ba6', '#966e93'];
  const series = groups.flatMap(playerGroup => metrics.map(kind => ({
    label: (group === 'all' ? '' : groupNames[playerGroup] + ' · ') + metricNames[kind],
    values: puzzles.map(puzzle => metricValue(countsFor(puzzle, playerGroup), kind)),
  })));
  const width = Math.max(740, puzzles.length * 72 + 90);
  const height = 340;
  const x = (index: number) => 65 + index * (width - 105) / Math.max(1, puzzles.length - 1);
  const y = (value: number) => 238 - value * 205;
  const hasData = series.some(line => line.values.some(value => value !== null));
  const selected = puzzles.find(puzzle => puzzle.id === active) ?? puzzles[0];
  return <>
    <div className="chart-scroll">
      <svg className="accuracy-chart" style={{minWidth:width}} viewBox={'0 0 ' + width + ' ' + height} role="group" aria-label="按题号排列的正确率曲线；横轴题号可跳转到题目">
        <title>正确率曲线</title>
        {[0, .25, .5, .75, 1].map(value => <g key={value}>
          <line x1="58" x2={width - 25} y1={y(value)} y2={y(value)} stroke="#dde5de" />
          <text x="47" y={y(value) + 4} textAnchor="end" className="axis-label">{value * 100}%</text>
        </g>)}
        {!hasData && <text x={width / 2} y="134" textAnchor="middle" className="chart-empty">暂无这一组玩家的提交数据</text>}
        {series.map((line, lineIndex) => {
          let previous = false;
          const path = line.values.map((value, index) => {
            if (value === null) { previous = false; return ''; }
            const part = (previous ? 'L' : 'M') + x(index) + ',' + y(value);
            previous = true;
            return part;
          }).join(' ');
          return <g key={line.label}>
            <path d={path} fill="none" stroke={colors[lineIndex]} strokeWidth="2.5" strokeDasharray={lineIndex % 2 ? '6 4' : undefined} />
            {line.values.map((value, index) => value !== null && <circle key={index} cx={x(index)} cy={y(value)} r="5" fill={colors[lineIndex]} stroke="#fffdf8" strokeWidth="2"
              onMouseEnter={() => setActive(puzzles[index].id)}><title>{puzzles[index].id + ' · ' + line.label + '：' + (value * 100).toFixed(1) + '%'}</title></circle>)}
          </g>;
        })}
        {puzzles.map((puzzle, index) => <a key={puzzle.id} href={puzzleLink(puzzle.id, bookUrl)} aria-label={'打开 ' + puzzle.id}
          onMouseEnter={() => setActive(puzzle.id)} onFocus={() => setActive(puzzle.id)}>
          <rect x={x(index) - 30} y="250" width="60" height="44" rx="5" fill="transparent" />
          <text x={x(index)} y="275" textAnchor="middle" className="puzzle-axis">{puzzle.id}</text>
          <text x={x(index)} y="311" textAnchor="middle" className="axis-label">{'n=' + groups.reduce((sum, item) => sum + countsFor(puzzle, item).players, 0)}</text>
        </a>)}
      </svg>
    </div>
    <div className="chart-legend">{series.map((line, index) => <span key={line.label}><i style={{borderColor: colors[index], borderStyle: index % 2 ? 'dashed' : 'solid'}} />{line.label}</span>)}</div>
    {selected && <div className="chart-detail" aria-live="polite"><a href={puzzleLink(selected.id, bookUrl)}>{selected.id} ↗</a>
      {groups.map(item => { const counts = countsFor(selected, item); return <span key={item}>{groupNames[item]}：{number(counts.players)} 人 · {number(counts.checks)} 次提交 · 首次 {percentage(counts.firstCorrect, counts.players)} · 总计 {percentage(counts.correctChecks, counts.checks)}</span>; })}
    </div>}
  </>;
}

export function Dashboard() {
  const [data, setData] = useState<StatsSnapshot | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [chapter, setChapter] = useState(1);
  const [metric, setMetric] = useState<Metric>('both');
  const [group, setGroup] = useState<Group>('all');
  const [bonus, setBonus] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const endpoint = location.origin === STATS_ORIGINS[0] ? DEFAULT_STATS_ENDPOINT.replace('/check', '/stats') : '/api/stats';
    fetch(endpoint, {signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]), credentials: 'omit'})
      .then(async response => {
        if (!response.ok) throw new Error('暂时无法读取统计数据（' + response.status + '）。');
        const snapshot = await response.json() as StatsSnapshot;
        if (!snapshot.summary || !Array.isArray(snapshot.puzzles) || !Array.isArray(snapshot.chapters)) throw new Error('统计数据格式无效。');
        setData(snapshot);
        setChapter(previous => snapshot.chapters.some(item => item.chapter === previous) ? previous : snapshot.chapters[0]?.chapter ?? 1);
      }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '读取失败，请稍后重试。'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  const shown = data?.puzzles.filter(puzzle => puzzle.chapter === chapter && (bonus || !/[A-Z]$/.test(puzzle.id))) ?? [];
  const tried = data?.puzzles.reduce((total, puzzle) => total + puzzle.counts.players, 0) ?? 0;
  const solved = data?.puzzles.reduce((total, puzzle) => total + puzzle.counts.solved, 0) ?? 0;
  const firstRight = data?.puzzles.reduce((total, puzzle) => total + puzzle.counts.firstCorrect, 0) ?? 0;
  const exportData = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'puzzle-statistics.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="stats-shell">
    <header className="stats-header"><a className="stats-brand" href={bookUrl}>Self-Referential Puzzle Book</a><a href={bookUrl}>返回题目 ↗</a></header>
    <main>
      <div className="stats-title"><div><p className="eyebrow">PUZZLE BOOK · OBSERVATIONS</p><h1>答题统计</h1><p>从匿名提交中观察进度、难度与解题过程。</p></div>
        <div className="stats-actions"><button onClick={() => setRefresh(value => value + 1)} disabled={loading}>{loading ? '读取中…' : '刷新'}</button><button onClick={exportData} disabled={!data}>导出聚合数据</button></div>
      </div>
      {error && <div className="stats-error" role="alert">{error} <button onClick={() => setRefresh(value => value + 1)}>重试</button></div>}
      {!data && loading && <p role="status">正在读取匿名答题统计…</p>}
      {data && <>
        <p className="stats-meta">更新于 {new Date(data.generatedAt).toLocaleString('zh-CN')} · 缓存最多 5 分钟 · 仅统计当前题目版本{data.summary.since !== null && ' · 首次收集于 ' + new Date(data.summary.since).toLocaleDateString('zh-CN')}</p>
        {data.summary.players === 0 && <div className="stats-empty">还没有答题提交。玩家点击 Check answers 后，这里会开始显示真实数据。</div>}
        <div className="metric-cards">
          <article><span>匿名答题者</span><strong>{number(data.summary.players)}</strong><small>提交过完整题组的浏览器 ID</small></article>
          <article><span>平均尝试题数</span><strong>{average(tried, data.summary.players)}</strong><small>每位玩家的不同题组数</small></article>
          <article><span>平均解出题数</span><strong>{average(solved, data.summary.players)}</strong><small>至少一次提交正确</small></article>
          <article><span>检查事件</span><strong>{number(data.summary.events)}</strong><small>{number(data.summary.checks)} 条题组提交，重试已去重</small></article>
        </div>
        <section className="stats-panel"><div className="panel-heading"><h2>每章进度</h2><span>完成 = 当前章节全部题组至少答对一次，含附加题</span></div>
          <div className="chapter-cards">{data.chapters.map(item => {
            const chapterPuzzles = data.puzzles.filter(puzzle => puzzle.chapter === item.chapter);
            const attempts = chapterPuzzles.reduce((sum, puzzle) => sum + puzzle.counts.players, 0);
            const successes = chapterPuzzles.reduce((sum, puzzle) => sum + puzzle.counts.solved, 0);
            return <article key={item.chapter}><h3>Chapter {String(item.chapter).padStart(2, '0')}</h3>
              <p><strong>{number(item.completed)}</strong> / {number(item.players)} 人完成</p>
              <div className="progress-track" role="img" aria-label={'本章玩家完成率 ' + percentage(item.completed, item.players)}><i style={{width: (ratio(item.completed, item.players) ?? 0) * 100 + '%'}} /></div>
              <p>玩家完成率 <b>{percentage(item.completed, item.players)}</b></p>
              <small>题组完成率 {percentage(successes, item.players * chapterPuzzles.length)} · 平均尝试 {average(attempts, item.players)} / {chapterPuzzles.length} 题</small>
            </article>;
          })}</div>
        </section>
        <section className="stats-panel"><div className="panel-heading"><h2>题目正确率曲线</h2><span>点击横轴题号可打开题目；n 为首次提交人数</span></div>
          <div className="chart-controls">
            <label>章节<select aria-label="章节" value={chapter} onChange={event => setChapter(Number(event.target.value))}>{data.chapters.map(item => <option key={item.chapter} value={item.chapter}>Chapter {String(item.chapter).padStart(2, '0')}</option>)}</select></label>
            <label>指标<select aria-label="指标" value={metric} onChange={event => setMetric(event.target.value as Metric)}><option value="both">首次与总正确率</option><option value="first">首次提交正确率</option><option value="all">总提交正确率</option><option value="solved">最终解出率</option></select></label>
            <label>玩家分组<select aria-label="玩家分组" value={group} onChange={event => setGroup(event.target.value as Group)}><option value="all">所有玩家</option><option value="compare">高正确率 vs 普通玩家</option><option value="high">高正确率玩家</option><option value="ordinary">普通玩家</option><option value="insufficient">样本不足玩家</option></select></label>
            <label className="bonus-toggle"><input type="checkbox" checked={bonus} onChange={event => setBonus(event.target.checked)} />包含附加题</label>
          </div>
          <AccuracyChart key={chapter} puzzles={shown} group={group} metric={metric} />
          <p className="mobile-scroll-hint">在手机上可左右滑动图表与下方表格。</p>
          <p className="stats-note">高正确率：其他至少 8 题的首次正确率 ≥80%；普通：其他至少 8 题且低于 80%。不足 8 题单独列出。分组按当前收集的数据回溯计算，不代表作答时水平。缺少数据的点不连线。</p>
          <div className="table-scroll"><table><caption>本章各题提交与解出情况</caption><thead><tr><th>题号</th><th>人数</th><th>首次正确率</th><th>总正确率</th><th>解出率</th><th>平均提交</th><th>错后解出</th></tr></thead><tbody>{shown.map(puzzle => {
            const counts = countsFor(puzzle, group === 'compare' ? 'all' : group);
            return <tr key={puzzle.id}><th><a href={puzzleLink(puzzle.id, bookUrl)}>{puzzle.id} ↗</a></th><td>{number(counts.players)}</td><td>{percentage(counts.firstCorrect, counts.players)}</td><td>{percentage(counts.correctChecks, counts.checks)}</td><td>{percentage(counts.solved, counts.players)}</td><td>{average(counts.checks, counts.players)}</td><td>{percentage(counts.recovered, counts.players - counts.firstCorrect)}</td></tr>;
          })}</tbody></table></div>
          {group === 'compare' && <p className="stats-note">比较曲线显示两个分组；下表显示所有玩家，含样本不足玩家。</p>}
        </section>
        <div className="support-panels">
          <section className="stats-panel"><h2>解题过程</h2><dl className="process-metrics"><div><dt>整体首次正确率</dt><dd>{percentage(firstRight, tried)}</dd></div><div><dt>重复检查玩家占比</dt><dd>{percentage(data.summary.returningPlayers, data.summary.players)}</dd></div><div><dt>每位玩家平均检查事件</dt><dd>{average(data.summary.events, data.summary.players)}</dd></div></dl>
            <h3>每位玩家尝试的题数</h3><div className="distribution">{['1–3', '4–8', '9–16', '17+'].map(band => { const count = data.distribution.find(item => item.band === band)?.players ?? 0; return <div key={band}><span>{band} 题</span><div className="progress-track"><i style={{width:(ratio(count, data.summary.players) ?? 0)*100+'%'}} /></div><b>{number(count)} 人</b></div>; })}</div>
          </section>
          <section className="stats-panel"><h2>最近 30 天提交活动</h2><p className="stats-note">按 UTC 日期；只列出有提交的日期。</p><div className="activity-table table-scroll"><table><thead><tr><th>日期</th><th>答题者</th><th>检查事件</th><th>题组提交</th></tr></thead><tbody>{data.activity.length ? data.activity.map(item => <tr key={item.day}><td>{item.day}</td><td>{number(item.players)}</td><td>{number(item.events)}</td><td>{number(item.checks)}</td></tr>) : <tr><td colSpan={4}>暂无近期提交</td></tr>}</tbody></table></div></section>
        </div>
        <section className="stats-definitions"><h2>这些数字代表什么</h2><p>只收集点击 Check answers 后的完整 Q 题组，例题不计入；无法统计仅浏览而没有提交的玩家。每个浏览器、设备和域名都有独立匿名 ID，同一个人可能被计为多个答题者。</p><p>首次正确率按玩家首次收到的提交计一次；总正确率按所有检查次数计，反复检查也会计入。每次章节检查记录所有填完的 Q，包含未改动的答案，因此总正确率会受重复检查影响。解出率表示至少一次答对的玩家比例，不代表首次答对。章节完成按跨多次检查累计解出计算，不要求同一次检查全部答对。数据按当前内容版本筛选，修改题目后重新统计。</p><p>本页公开聚合计数，原始匿名 ID 与逐条事件留在数据库。没有保存或回写玩家正确率、水平标签；它们均在读取和分析时计算。小样本的百分比容易波动，请结合人数判断。网络重试不重复计数。</p></section>
      </>}
    </main><footer>Self-Referential Puzzle Book · <a href={bookUrl}>继续解题 ↗</a></footer>
  </div>;
}
