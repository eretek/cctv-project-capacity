/*! Eretek Online Araçlar #79 — CCTV Proje Kapasite Özeti */
ERT.def('79', {
	run: function (v, c) {
		var r = c.csv(v.csv, 'csv', 500), H = r.head, col = function (n) { return ERT.csv.col(H, n); };
		var iL = col(['group', 'label', 'grup', 'name']), iC = col(['cams', 'cameras', 'kamera', 'count']), iM = col(['mbps', 'main_mbps', 'bitrate']), iS = col(['sub_mbps', 'sub']), iW = col(['poe_w', 'watt', 'w']), iH = col(['hours', 'saat']), iD = col(['days', 'gun', 'tage']);
		if (iC < 0 || iM < 0 || iD < 0) { throw c.fe('csv', 'col', { c: 'group, cams, mbps, poe_w, hours, days' }); }
		var G = r.rows.map(function (x, i) {
			var n = function (k, d) { return k >= 0 && x[k] !== '' ? ERT.parseNum(x[k], 'en') : d; }, g = { label: iL >= 0 ? x[iL] : '#' + (i + 1), cams: n(iC), mbps: n(iM), sub: n(iS, 0), w: n(iW, 0), hours: n(iH, 24), days: n(iD) };
			if (!(g.cams > 0) || Math.floor(g.cams) !== g.cams || !(g.mbps > 0) || !(g.days > 0) || !(g.hours > 0 && g.hours <= 24) || !(g.w >= 0) || !(g.sub >= 0)) { throw c.fe('csv', 'rowNum', { r: i + 2 }); }
			return g;
		});
		var st = ERT.cap.storage({ groups: G, overhead: v.oh, usable: v.usable ? v.usable * 1e12 : null });
		var bw = ERT.cap.bandwidth({ groups: G.map(function (g) { return { cams: g.cams, main: g.mbps, sub: g.sub }; }), recordSub: false, clients: v.viewers ? [{ n: 1, streams: v.viewers, mbps: G.reduce(function (s, g) { return s + (g.sub || g.mbps) * g.cams; }, 0) / G.reduce(function (s, g) { return s + g.cams; }, 0) }] : [] });
		var pw = G.filter(function (g) { return g.w > 0; });
		var pe = pw.length ? ERT.cap.poe({ groups: pw.map(function (g) { return { n: g.cams, w: g.w, label: g.label }; }), basis: 'pd', std: v.std, budget: v.budget || 1e9, margin: v.margin }) : null;
		var cams = G.reduce(function (s, g) { return s + g.cams; }, 0), msgs = [];
		if (v.usable) { msgs.push(st.fits ? ['ok', c.t('stOk', { f: c.bytes(st.free) })] : ['err', c.t('stNo', { f: c.bytes(-st.free) })]); }
		if (pe && v.budget) { msgs.push(pe.budgetOk ? ['ok', c.t('poeOk', { f: c.n(pe.free, 1) })] : ['err', c.t('poeNo', { f: c.n(-pe.free, 0) })]); }
		if (pe && !pe.portOk) { msgs.push(['err', c.t('portNo', { l: pe.viol.map(function (i) { return pw[i].label; }).join(', ') })]); }
		if (v.uplink) { var u = bw.ingest / v.uplink; msgs.push(u > 0.7 ? ['warn', c.t('upHigh', { p: c.pct(u, 0) })] : ['ok', c.t('upOk', { p: c.pct(u, 0) })]); }
		msgs.push(['info', c.t('basis')]);
		var rows = G.map(function (g, i) { return [g.label, g.cams, c.n(g.mbps, 2), g.hours, g.days, c.n(st.rows[i].bytes / 1e12, 2), g.w ? c.n(g.w, 1) : '–', pe && g.w ? c.n(pe.rows[pw.indexOf(g)].sum, 1) : '–']; });
		rows.push([c.t('tot'), cams, '', '', '', c.n(st.total / 1e12, 2), '', pe ? c.n(pe.total, 1) : '–']);
		var cols = [c.t('c_g'), c.t('c_c'), 'Mbit/s', c.t('c_h'), c.t('c_d'), 'TB', c.t('c_w'), c.t('c_pw')];
		var R2 = function (x) { return Math.round(x * 1000) / 1000; }, data = G.map(function (g, i) { return [g.label, g.cams, g.mbps, g.hours, g.days, R2(st.rows[i].bytes / 1e12), g.w || '', pe && g.w ? R2(pe.rows[pw.indexOf(g)].sum) : '']; });
		data.push([c.t('tot'), cams, '', '', '', R2(st.total / 1e12), '', pe ? R2(pe.total) : '']);
		var sumData = [[c.t('cams'), cams], [c.t('st') + ' (TB)', R2(st.total / 1e12)], [c.t('ingest') + ' (Mbit/s)', R2(bw.ingest)], [c.t('egress') + ' (Mbit/s)', R2(bw.egress)], [c.t('poe') + ' (W)', pe ? R2(pe.total) : 0], [c.t('ports'), pe ? pe.ports : 0]];
		var sum = [[c.t('cams'), cams], [c.t('st'), c.bytes(st.total)], [c.t('ingest'), c.n(bw.ingest, 1) + ' Mbit/s'], [c.t('egress'), c.n(bw.egress, 1) + ' Mbit/s'], [c.t('poe'), pe ? c.n(pe.total, 1) + ' W' : '–'], [c.t('ports'), pe ? pe.ports : 0]];
		return { big: c.t('big', { n: cams, s: c.bytes(st.total), p: pe ? c.n(pe.total, 0) : 0 }), kv: sum, msgs: msgs, tables: [{ cols: cols, rows: rows }], x: { xlsx: { name: 'cctv-project', sheets: [{ name: c.t('sh1'), cols: cols, rows: data }, { name: c.t('sh2'), cols: [c.t('c_k'), c.t('c_v')], rows: sumData }] }, csv: { name: 'cctv-project', cols: cols, rows: data } }, v: { cams: cams, storageTB: Math.round(st.total / 1e9) / 1000, ingest: bw.ingest, poeW: pe ? pe.total : 0, poeOk: pe && v.budget ? pe.budgetOk : null } };
	}
});
