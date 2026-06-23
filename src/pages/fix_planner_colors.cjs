const fs = require('fs');

let content = fs.readFileSync('CreatePlanner.tsx', 'utf8');

// 1. Previous button
content = content.replace(
  /className="inline-flex items-center gap-2 rounded-xl bg-gray-200 px-6 py-2\.5 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-300 transition"/g,
  'className="inline-flex items-center gap-2 rounded-xl bg-gray-200 dark:bg-slate-800 px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-slate-300 disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-slate-700 transition"'
);

// 2. Red Alerts (Daily Study Time Limit Exceeded)
content = content.replace(
  /className="mb-6 p-5 border border-red-200 bg-red-50\/50 rounded-2xl flex flex-col md:flex-row items-start gap-4"/g,
  'className="mb-6 p-5 border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/10 rounded-2xl flex flex-col md:flex-row items-start gap-4"'
);
content = content.replace(
  /className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0"/g,
  'className="p-2 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 shrink-0"'
);
content = content.replace(
  /className="text-sm font-bold text-red-800"/g,
  'className="text-sm font-bold text-red-800 dark:text-red-400"'
);
content = content.replace(
  /className="text-xs text-red-700 mt-1 leading-relaxed"/g,
  'className="text-xs text-red-700 dark:text-red-300 mt-1 leading-relaxed"'
);
content = content.replace(
  /className="block text-\[11px\] font-bold text-red-800 uppercase tracking-wide mb-1"/g,
  'className="block text-[11px] font-bold text-red-800 dark:text-red-400 uppercase tracking-wide mb-1"'
);
content = content.replace(
  /className="w-full rounded-lg border border-red-200 bg-white px-3 py-1\.5 text-xs text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"/g,
  'className="w-full rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:bg-[#1a2035] px-3 py-1.5 text-xs text-gray-900 dark:text-slate-100 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-500/20"'
);
content = content.replace(
  /className="text-\[10px\] text-red-600 mt-1"/g,
  'className="text-[10px] text-red-600 dark:text-red-400 mt-1"'
);

// 3. Green Alert (Based on selected SLOs)
content = content.replace(
  /className="mb-6 p-4 border border-emerald-100 bg-emerald-50\/30 rounded-xl flex items-center gap-3"/g,
  'className="mb-6 p-4 border border-emerald-100 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/10 rounded-xl flex items-center gap-3"'
);
content = content.replace(
  /className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold"/g,
  'className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold"'
);
content = content.replace(
  /className="text-xs text-emerald-800"/g,
  'className="text-xs text-emerald-800 dark:text-emerald-400"'
);

// 4. Preview Summary box (bg-gray-50 etc)
content = content.replace(
  /className="bg-gray-50 rounded-xl p-6 space-y-4"/g,
  'className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-6 space-y-4"'
);
content = content.replace(
  /className="text-xs text-gray-500 uppercase tracking-wide"/g,
  'className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide"'
);
content = content.replace(
  /className="text-sm font-semibold text-gray-900"/g,
  'className="text-sm font-semibold text-gray-900 dark:text-slate-100"'
);
content = content.replace(
  /className="font-semibold text-gray-900"/g,
  'className="font-semibold text-gray-900 dark:text-slate-100"'
);
// "RECOMMENDED (Global)" badges
content = content.replace(
  /'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'/g,
  "'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'"
);

fs.writeFileSync('CreatePlanner.tsx', content);
console.log('Done fixing Planner colors');
