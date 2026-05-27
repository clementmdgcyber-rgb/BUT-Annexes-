const stats   = $('Analyser_agréger_données1').first().json;
const node    = stats.node    || {};
const network = stats.network || {};
const syslog  = stats.syslog  || {};
const tasks   = stats.tasks   || {};
const rawLlm  = $input.first().json?.text || $input.first().json?.output || '';

let analysis = { summary: '', risk_level: 'low', cpu_analysis: '', memory_analysis: '',
                 network_analysis: '', syslog_analysis: '', task_analysis: '', recommendations: [] };
try {
  const cleaned = rawLlm.replace(/```json|```/g, '').trim();
  const match   = cleaned.match(/\{[\s\S]*\}/);
  analysis = JSON.parse(match ? match[0] : cleaned);
} catch(e) {
  analysis.summary = typeof rawLlm === 'string' ? rawLlm : 'Analyse non disponible.';
}

const riskLevel = (analysis.risk_level || 'low').toLowerCase();
const riskPalette = {
  low:    { bg: '#f0f4f0', border: '#4a7c59', text: '#2d5a3d', label: 'FAIBLE' },
  medium: { bg: '#fdf6ec', border: '#b8860b', text: '#7a5800', label: 'MOYEN' },
  high:   { bg: '#fdf0f0', border: '#9e3030', text: '#6b1f1f', label: 'ÉLEVÉ' }
};
const risk = riskPalette[riskLevel] || riskPalette.low;

const cpuPct  = node.cpu_percent  || 0;
const ramPct  = node.mem_total_gb > 0 ? Math.round((node.mem_used_gb / node.mem_total_gb) * 100) : 0;
const swapPct = node.swap_total_gb > 0 ? Math.round((node.swap_used_gb / node.swap_total_gb) * 100) : 0;

const barColor = (pct) => pct > 80 ? '#9e3030' : pct > 50 ? '#b8860b' : '#4a7c59';

const uptimeDays = Math.floor(node.uptime_h / 24);
const uptimeDisplay = uptimeDays > 0 ? `${uptimeDays}j ${node.uptime_h % 24}h` : `${node.uptime_h}h`;


const ifRows = (network.interfaces || []).map(iface => {
  const statusColor = iface.isUp ? '#2d5a3d' : '#9e3030';
  const statusLabel = iface.isUp ? 'Actif' : 'Inactif';
  return `<tr>
    <td class="td">${iface.name || '—'}</td>
    <td class="td" style="color:${statusColor};font-weight:600;">${statusLabel}</td>
    <td class="td">${iface.speed || 'N/A'}</td>
    <td class="td">${iface.inMB} Mo</td>
    <td class="td">${iface.outMB} Mo</td>
  </tr>`;
}).join('') || `<tr><td colspan="5" class="td empty">Aucune donnée disponible</td></tr>`;

const taskRows = (tasks.recent || []).slice(0, 10).map(t => {
  const isOk = t.status === 'OK' || t.status === 'En cours';
  const sc    = t.status === 'En cours' ? '#b8860b' : isOk ? '#2d5a3d' : '#9e3030';
  return `<tr>
    <td class="td small">${t.starttime}</td>
    <td class="td">${t.type}</td>
    <td class="td">${t.user}</td>
    <td class="td" style="color:${sc};font-weight:600;">${t.status || 'En cours'}</td>
  </tr>`;
}).join('') || `<tr><td colspan="4" class="td empty">Aucune tâche récente</td></tr>`;

const syslogRows = (syslog.errors || []).slice(0, 8).map(e => {
  return `<tr>
    <td class="td small">${e.time || e.line || '—'}</td>
    <td class="td msg">${e.message}</td>
  </tr>`;
}).join('') || `<tr><td colspan="2" class="td empty">Aucune erreur critique détectée</td></tr>`;

const recoItems = Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0
  ? analysis.recommendations.map((r, i) => `<div class="reco-item"><span class="reco-num">${i+1}</span><span>${r}</span></div>`).join('')
  : '<div class="reco-item"><span class="reco-num">—</span><span>Aucune recommandation particulière.</span></div>';

const sectionLabels = [
  { key: 'cpu_analysis',     label: 'Processeur' },
  { key: 'memory_analysis',  label: 'Mémoire' },
  { key: 'network_analysis', label: 'Réseau' },
  { key: 'syslog_analysis',  label: 'Journaux système' },
  { key: 'task_analysis',    label: 'Tâches et sauvegardes' }
];
const analysisSections = sectionLabels.map(s =>
  `<div class="analysis-row">
    <div class="analysis-label">${s.label}</div>
    <div class="analysis-text">${analysis[s.key] || '—'}</div>
  </div>`
).join('');

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapport Serveur ipl-srv-03 — ${stats.date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #f2f2f2;
    color: #1c1c1c;
    padding: 32px 24px;
    font-size: 13px;
    line-height: 1.55;
  }

  .page {
    max-width: 860px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #d0d0d0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 32px;
    background: #2b2b2b;
    color: #ffffff;
    border-bottom: 3px solid #7a0000;
  }
  .header-left h1 {
    font-size: 17px;
    font-weight: bold;
    letter-spacing: 0.2px;
    color: #ffffff;
  }
  .header-left .subtitle {
    font-size: 12px;
    color: #b0b0b0;
    margin-top: 3px;
  }
  .header-right {
    text-align: right;
    font-size: 11px;
    color: #909090;
  }
  .header-right .date {
    font-size: 12px;
    color: #d0d0d0;
    font-weight: bold;
    margin-bottom: 2px;
  }

  .risk-banner {
    background: ${risk.bg};
    border-left: 4px solid ${risk.border};
    padding: 11px 20px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    border-bottom: 1px solid #e0e0e0;
  }
  .risk-tag {
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    color: ${risk.text};
    letter-spacing: 1px;
    white-space: nowrap;
    padding-top: 1px;
    min-width: 80px;
  }
  .risk-summary { font-size: 13px; color: #333; }

  .section { padding: 20px 32px; border-bottom: 1px solid #e8e8e8; }
  .section:last-child { border-bottom: none; }

  .section-title {
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #7a0000;
    margin-bottom: 14px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e0e0e0;
  }

  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  @media (max-width: 600px) { .metrics { grid-template-columns: repeat(2, 1fr); } }

  .metric-card {
    background: #f8f8f8;
    border: 1px solid #e0e0e0;
    padding: 14px 16px;
  }
  .metric-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
  .metric-value { font-size: 22px; font-weight: bold; margin: 4px 0 2px; color: #1c1c1c; }
  .metric-sub   { font-size: 11px; color: #777; }
  .bar-bg  { background: #ddd; height: 3px; margin-top: 8px; }
  .bar-fill{ height: 3px; }

  .net-summary { display: flex; gap: 12px; margin-bottom: 14px; }
  .net-badge {
    padding: 5px 14px;
    font-size: 11px;
    font-weight: bold;
    border: 1px solid;
  }
  .badge-up    { background: #f0f4f0; color: #2d5a3d; border-color: #4a7c59; }
  .badge-down  { background: #fdf0f0; color: #9e3030; border-color: #c05050; }
  .badge-total { background: #f5f5f5; color: #555;    border-color: #ccc; }

  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #f5f5f5; }
  th {
    text-align: left;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #666;
    padding: 8px 10px;
    border-bottom: 2px solid #d0d0d0;
  }
  .td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #333; vertical-align: middle; }
  .td.small { font-size: 11px; color: #666; white-space: nowrap; }
  .td.msg   { font-family: 'Courier New', Courier, monospace; font-size: 11px; word-break: break-all; }
  .td.empty { text-align: center; color: #aaa; font-style: italic; padding: 14px; }
  tr:last-child .td { border-bottom: none; }

  .analysis-row {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;
    align-items: baseline;
  }
  .analysis-row:last-child { border-bottom: none; }
  .analysis-label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
  .analysis-text  { font-size: 13px; color: #333; }

  .reco-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 9px 0;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
  }
  .reco-item:last-child { border-bottom: none; }
  .reco-num {
    min-width: 20px;
    height: 20px;
    background: #2b2b2b;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    flex-shrink: 0;
  }

  .footer {
    background: #2b2b2b;
    color: #777;
    padding: 12px 32px;
    font-size: 11px;
    display: flex;
    justify-content: space-between;
  }
  .footer strong { color: #b0b0b0; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-left">
      <h1>Rapport de supervision — ipl-srv-03</h1>
      <div class="subtitle">Proxmox VE &nbsp;·&nbsp; Noeud réseau &nbsp;·&nbsp; Lourmel</div>
    </div>
    <div class="header-right">
      <div class="date">${stats.dateDisplay || stats.date}</div>
      <div>ipl-srv-03 · Proxmox VE</div>
    </div>
  </div>

  <div class="risk-banner">
    <div class="risk-tag">${risk.label}</div>
    <div class="risk-summary">${analysis.summary || stats.summary}</div>
  </div>

  <div class="section">
    <div class="section-title">Ressources serveur</div>
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">CPU</div>
        <div class="metric-value" style="color:${barColor(cpuPct)}">${cpuPct}%</div>
        <div class="metric-sub">Charge processeur</div>
        <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(cpuPct,100)}%;background:${barColor(cpuPct)}"></div></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Mémoire vive</div>
        <div class="metric-value" style="color:${barColor(ramPct)}">${ramPct}%</div>
        <div class="metric-sub">${node.mem_used_gb} / ${node.mem_total_gb} Go</div>
        <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(ramPct,100)}%;background:${barColor(ramPct)}"></div></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Swap</div>
        <div class="metric-value" style="color:${barColor(swapPct)}">${swapPct}%</div>
        <div class="metric-sub">${node.swap_used_gb} / ${node.swap_total_gb} Go</div>
        <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(swapPct,100)}%;background:${barColor(swapPct)}"></div></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Disponibilité</div>
        <div class="metric-value" style="font-size:18px">${uptimeDisplay}</div>
        <div class="metric-sub">${node.kversion}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">État des interfaces réseau (SNMP)</div>
    <div class="net-summary">
      <div class="net-badge badge-up">${network.ports_up || 0} actif(s)</div>
      <div class="net-badge badge-down">${network.ports_down || 0} inactif(s)</div>
      <div class="net-badge badge-total">${network.total_ports || 0} interfaces au total</div>
    </div>
    <table>
      <thead><tr><th>Interface</th><th>État</th><th>Vitesse</th><th>Trafic entrant</th><th>Trafic sortant</th></tr></thead>
      <tbody>${ifRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Journaux système — Erreurs récentes</div>
    <div style="font-size:12px;color:#888;margin-bottom:12px;">${syslog.total_lines || 0} lignes analysées &nbsp;·&nbsp; ${(syslog.errors || []).length} anomalie(s) détectée(s)</div>
    <table>
      <thead><tr><th>Référence</th><th>Message</th></tr></thead>
      <tbody>${syslogRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Historique des tâches et sauvegardes</div>
    <div style="font-size:12px;color:#888;margin-bottom:12px;">${tasks.total || 0} tâches &nbsp;·&nbsp; ${(tasks.errors || []).length} en erreur &nbsp;·&nbsp; ${(tasks.backups || []).length} sauvegardes</div>
    <table>
      <thead><tr><th>Date</th><th>Type</th><th>Utilisateur</th><th>Statut</th></tr></thead>
      <tbody>${taskRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Diagnostic technique</div>
    ${analysisSections}
  </div>

  <div class="section">
    <div class="section-title">Recommandations</div>
    ${recoItems}
  </div>

  <div class="footer">
    <span>Proxmox VE &nbsp;·&nbsp; <strong>ipl-srv-03</strong> &nbsp;·&nbsp; Lourmel</span>
    <span>${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}</span>
  </div>

</div>
</body>
</html>`;

return [{
  json: {
    htmlReport : html,
    date       : stats.date,
    risk_level : riskLevel,
    subject    : `[LOURMEL] ipl-srv-03 — Risque ${risk.label} — ${stats.date}`
  }
}];
