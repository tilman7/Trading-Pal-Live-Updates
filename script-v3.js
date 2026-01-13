
/* PWA / iOS standalone detection (Add to Home Screen)
   Used by CSS to keep the bottom nav "floating" and not stretched to the screen edge. */
function applyStandaloneClass() {
  const isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  if (document.body) document.body.classList.toggle('is-standalone', isStandalone);
}
document.addEventListener('DOMContentLoaded', applyStandaloneClass);
window.addEventListener('resize', applyStandaloneClass);

// Trading Pal App Logic
// This script powers the navigation, routines, reviews, analytics and settings

// Utility: get and set data in localStorage
function loadData() {
  const data = JSON.parse(localStorage.getItem('tradingPalData') || '{}');
  return {
    morningEntries: data.morningEntries || [],
    reviewEntries: data.reviewEntries || [],
    rules: data.rules || [
      'Follow the plan',
      'Never revenge trade',
      'Stick to risk limits',
    ],
    limits: data.limits || { maxTrades: '', maxLoss: '' },
    strict: data.strict || false,
    // Habits list and daily completion entries. Habits define what to track; habitEntries
    // stores completion state for each date. Default to empty arrays if none exist.
    habits: data.habits || [],
    habitEntries: data.habitEntries || [],
  };
}

// -----------------------------------------------------------------------------
// Sample data generator
//
// To give new users an impression of how the app looks after a month of
// disciplined use, we generate a month of dummy morning and review entries
// when no real entries exist.  The data is only generated once (marked
// via a flag in localStorage) and includes roughly 20 trading days of
// morning and evening reviews with random trades, PnL values, compliance
// status and short lesson notes.  If you wish to reset the data, clear
// localStorage and reload the page.
function ensureSampleData() {
  // Generate sample/demo data only on a truly fresh install.
  // If the user explicitly reset data, we skip sample generation.
  if (localStorage.getItem('disableSampleData') === 'true') return;

  const state = loadData();
  const hasAnyData =
    (state.morningEntries && state.morningEntries.length) ||
    (state.reviewEntries && state.reviewEntries.length) ||
    (state.habitEntries && state.habitEntries.length) ||
    (state.habits && state.habits.length);

  // If there is already data (real or previously generated), do nothing.
  if (hasAnyData) return;
  if (localStorage.getItem('sampleDataGenerated') === 'true') return;

  state.morningEntries = [];
  state.reviewEntries = [];
  // Define some sample habits if none exist
  if (!state.habits || state.habits.length === 0) {
    state.habits = ['Pre‑Market Review', 'Daily Journal', 'Exercise', 'Meditation'];
  }
  // Reset habit entries
  state.habitEntries = [];
  const ruleOptions = ['Risk', 'FOMO', 'Overtrading', null];
  // Generate 365 days of sample data for a richer habit and analytics display
  for (let i = 365; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString();
    state.morningEntries.push({
      id: Date.now() + Math.random(),
      date: iso,
      checklist: { plan: true, risk: true, calm: true },
    });
    // Only create review entries on weekdays (Mon-Fri)
    const day = d.getDay();
    if (day >= 1 && day <= 5) {
      const trades = Math.floor(Math.random() * 6) + 1;
      const pnl = Math.floor((Math.random() - 0.5) * 400); // -200 to +200
      const followed = Math.random() < 0.7;
      const ruleBreak = followed ? null : ruleOptions[Math.floor(Math.random() * (ruleOptions.length - 1))];
      const lesson = followed
        ? 'Followed the plan today and executed well.'
        : 'Need to work on discipline and avoid mistakes.';
      state.reviewEntries.push({
        id: Date.now() + Math.random(),
        date: iso,
        trades,
        pnl,
        followed,
        ruleBreak,
        note: lesson,
      });
    }

    // Generate habit completion entries: each day, randomly mark some habits as completed
    const completed = [];
    state.habits.forEach((h) => {
      if (Math.random() < 0.7) {
        completed.push(h);
      }
    });
    state.habitEntries.push({
      date: iso,
      completed,
    });
  }
  // Also reset any sample flag for demonstration
  localStorage.setItem('sampleDataGenerated', 'true');
  saveData(state);
}

function saveData(state) {
  localStorage.setItem('tradingPalData', JSON.stringify(state));
  // Cloud sync (Supabase) – no-op unless configured.
  try { window.__tpSync && window.__tpSync.schedulePush && window.__tpSync.schedulePush(state); } catch (e) {}
}

// Daily quotes extracted from the user's TL;DR document. A new quote is selected
// randomly each day and persisted in localStorage so it remains the same for
// the entire day. These phrases are intended to reinforce discipline and
// process-focused thinking rather than profits.
// Quotes derived from the TL;DR document.  All phrases have been
// translated to English to keep the interface consistent and to focus on
// process‑driven reminders. Each quote emphasises preparation,
// discipline, and avoiding common cognitive traps.  A random entry from
// this array is selected each day and cached in localStorage.
const dailyQuotes = [
  'Focus on clarity and your target.',
  'Your stop loss defines invalidation — respect it.',
  'Zoom out and prepare. Always.',
  "I'm not P&L. I'm hard work and discipline.",
  'Only take obvious trades.',
  'Force yourself to think from both sides.',
  "Eliminate the 'FVG equals trade' mindset.",
  "Don’t be too fixed on the higher time frame bias.",
  'Trading is a game of probabilities.'
];

function getDailyQuote() {
  const today = new Date().toISOString().slice(0, 10);
  const storedDate = localStorage.getItem('quoteDate');
  const storedQuote = localStorage.getItem('dailyQuote');
  if (storedDate === today && storedQuote) {
    return storedQuote;
  }
  const q = dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)];
  localStorage.setItem('quoteDate', today);
  localStorage.setItem('dailyQuote', q);
  return q;
}


// Navigation logic
const pages = ['home', 'routine', 'review', 'analytics', 'habits', 'settings', 'lessons', 'activity'];

function showPage(name) {
  pages.forEach((p) => {
    const section = document.getElementById(`page-${p}`);
    if (section) {
      section.classList.add('hidden');
    }
  });
  const target = document.getElementById(`page-${name}`);
  if (target) {
    // remove any existing animation class so it can retrigger
    target.classList.remove('fade-in');
    // unhide the page
    target.classList.remove('hidden');
    // force a reflow to restart the animation (necessary for successive navigations)
    void target.offsetWidth;
    // apply the fade-in animation
    target.classList.add('fade-in');
  }
  // update nav active state
  document.querySelectorAll('.nav-link').forEach((btn) => {
    if (btn.getAttribute('data-page') === name) {
      btn.classList.add('nav-active');
    } else {
      btn.classList.remove('nav-active');
    }
  });
  currentPage = name;
  // Set dynamic accent colours based on page BEFORE rendering page-specific data so charts can pick up the correct colour palette
  setAccentPalette(name);
  if (name === 'home') updateHomePage();
  if (name === 'analytics') updateAnalytics(currentRange);
  if (name === 'settings') loadSettings();
  if (name === 'review') loadReviewList();
  if (name === 'habits') updateHabitsPage();
  if (name === 'lessons') updateLessonsPage();
  if (name === 'activity') updateActivityPage();

  // Mobile/PWA: ensure the newly opened page renders from the top.
  // Without this, iOS "Add to Home Screen" can keep the old scroll position
  // and make pages look blank until you scroll.
  const main = document.getElementById('main');
  if (main) main.scrollTo(0, 0);
  window.scrollTo(0, 0);
}

// Change accent colours per page to reflect different categories
function setAccentPalette(page) {
  const palettes = {
    home: { start: '#7c3aed', end: '#60a5fa' }, // default purple/blue
    routine: { start: '#fbbf24', end: '#f59e0b' }, // yellow/orange
    review: { start: '#a855f7', end: '#7e22ce' }, // purple/dark purple
    analytics: { start: '#3b82f6', end: '#06b6d4' }, // blue/cyan
    settings: { start: '#10b981', end: '#059669' }, // green
    habits: { start: '#22c55e', end: '#10b981' }, // green lime for habits
    lessons: { start: '#a855f7', end: '#7e22ce' }, // reuse review purple palette for lessons
    activity: { start: '#f59e0b', end: '#ef4444' }, // warm gradient for activity
  };
  const palette = palettes[page] || palettes.home;
  document.documentElement.style.setProperty('--accent-start', palette.start);
  document.documentElement.style.setProperty('--accent-end', palette.end);
}

// Determine streak based on consecutive days of morning routine
function computeStreak(morningEntries) {
  // Sort entries by date descending
  const dates = morningEntries
    .map((e) => new Date(e.date))
    .sort((a, b) => b - a);
  if (dates.length === 0) return 0;
  let streak = 1;
  // Start from most recent entry
  for (let i = 1; i < dates.length; i++) {
    const diff = (dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Compute weekly stats (past 7 days)
function computeWeekStats(state) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  let trades = 0;
  let pnl = 0;
  let sessions = 0;
  state.reviewEntries.forEach((r) => {
    const d = new Date(r.date);
    if (d >= sevenDaysAgo) {
      trades += r.trades;
      pnl += Number(r.pnl);
    }
  });
  state.morningEntries.forEach((e) => {
    const d = new Date(e.date);
    if (d >= sevenDaysAgo) sessions++;
  });
  return { trades, pnl, sessions };
}

// Update home page data
function updateHomePage() {
  // Generate sample data on first load if no real entries exist
  ensureSampleData();
  const state = loadData();
  // Market status: simple check based on day/time (Mon-Fri, 09:30-16:00 NY) but approximate
  const now = new Date();
  const day = now.getDay(); // 0 Sunday
  const hour = now.getHours();
  const minute = now.getMinutes();
  // Day names array for dynamic greeting
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let status = 'Market Closed';
  // We'll assume market open Mon-Fri 15:30-22:00 (CET) for demonstration
  if (day >= 1 && day <= 5) {
    const minutesSinceMidnight = hour * 60 + minute;
    if (minutesSinceMidnight >= 15 * 60 + 30 && minutesSinceMidnight < 22 * 60) {
      status = 'Market Open';
    }
  }
  document.getElementById('market-status').textContent = status;
  const marketPill = document.getElementById('market-pill');
  if (marketPill) marketPill.textContent = status;
  // Streak
  const streak = computeStreak(state.morningEntries);
  document.getElementById('streak-text').textContent = `${streak} day${
    streak === 1 ? '' : 's'
  }`;
  // Week stats
  const stats = computeWeekStats(state);
  document.getElementById('week-trades').textContent = stats.trades;
  document.getElementById('week-pnl').textContent = `$${stats.pnl.toFixed(2)}`;
  // Colour the P&L number green if positive, red if negative
  const pnlElem = document.getElementById('week-pnl');
  if (stats.pnl > 0) {
    pnlElem.style.color = '#10b981';
  } else if (stats.pnl < 0) {
    pnlElem.style.color = '#ef4444';
  } else {
    // revert to default text colour defined in CSS
    pnlElem.style.color = '';
  }
  document.getElementById('week-sessions').textContent = stats.sessions;

  // Dynamic greeting element is intentionally removed to avoid duplicate messages.

  // Update the welcome header with a dynamic greeting based on time of day and day of week
  const welcomeElem = document.getElementById('welcome-message');
  if (welcomeElem) {
    let greeting = 'Hello';
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 18) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    welcomeElem.textContent = `${greeting}, Tilman! It’s ${dayNames[day]}.`;
  }
  // Recent activity: compile last 5 entries (morning or review).  Only update
  // the list if the corresponding element exists on the page (e.g. on the
  // home page card).  On designs where the card is removed, this block
  // simply does nothing.
  const list = document.getElementById('recent-activity');
  if (list) {
    const combined = [];
    state.morningEntries.forEach((e) => combined.push({ type: 'morning', date: e.date }));
    state.reviewEntries.forEach((e) => combined.push({ type: 'review', date: e.date }));
    combined.sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = '';
    combined.slice(0, 5).forEach((item) => {
      const li = document.createElement('li');
      li.className = 'flex justify-between items-center';
      const label = document.createElement('span');
      label.textContent =
        item.type === 'morning' ? 'Morning prep' : 'Evening review';
      const time = new Date(item.date);
      const dateStr = time.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const dateElem = document.createElement('span');
      dateElem.textContent = dateStr;
      dateElem.className = 'text-gray-400';
      li.appendChild(label);
      li.appendChild(dateElem);
      list.appendChild(li);
    });
  }

  // Daily quote: select a quote for today and display it in the home page card
  const quoteElem = document.getElementById('daily-quote');
  if (quoteElem) {
    let q = getDailyQuote();
    // On weekends or when market is closed, show a discipline reminder instead
    if (day === 0 || day === 6 || status === 'Market Closed') {
      q = 'Markets are closed today. Use this time to rest, study and stay disciplined.';
    }
    quoteElem.textContent = q;
  }

  // Display the latest lesson note as a quote on the streak card.  We
  // identify the most recent review note with text and place it in the
  // dedicated element on the home page streak card.  If no note exists,
  // clear the text.
  const latestNote = state.reviewEntries
    .filter((r) => r.note && r.note.trim().length > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const quoteTarget = document.getElementById('latest-lesson-quote');
  if (quoteTarget) {
    if (latestNote && latestNote.note) {
      // Wrap the note in quotation marks to emphasise it as a quote
      quoteTarget.textContent = `“${latestNote.note}”`;
    } else {
      quoteTarget.textContent = '';
    }
  }

  // Dynamic streak card button: adjust based on today's routines
  const startBtn = document.getElementById('start-streak');
  const secondaryBtn = document.getElementById('secondary-streak');
  if (startBtn) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const morningToday = state.morningEntries.find((e) => e.date.startsWith(todayStr));
    const reviewToday = state.reviewEntries.find((e) => e.date.startsWith(todayStr));
    if (!morningToday) {
      // no morning entry: show start morning
      startBtn.textContent = 'Start Morning Routine';
      startBtn.setAttribute('data-page', 'routine');
      startBtn.classList.remove('hidden');
      if (secondaryBtn) {
        secondaryBtn.textContent = 'Open Evening Review';
        secondaryBtn.classList.remove('hidden');
        secondaryBtn.setAttribute('data-page', 'review');
      }
    } else if (!reviewToday) {
      // morning done but no review: prompt evening review
      startBtn.textContent = 'Evening Review';
      startBtn.setAttribute('data-page', 'review');
      startBtn.classList.remove('hidden');
      if (secondaryBtn) {
        secondaryBtn.textContent = 'Open Morning Routine';
        secondaryBtn.classList.remove('hidden');
        secondaryBtn.setAttribute('data-page', 'routine');
      }
    } else {
      // both done: hide button
      startBtn.textContent = 'All Done';
      startBtn.classList.add('hidden');
      if (secondaryBtn) {
        secondaryBtn.textContent = 'View Analytics';
        secondaryBtn.classList.remove('hidden');
        secondaryBtn.setAttribute('data-page', 'analytics');
      }
    }
  }

  // Render calendar once per update
  renderCalendar();
}

// Render and update the habit tracker page. This function populates the list of
// habits for the current day, allows adding/removing habits, and computes
// daily progress. It relies on two additional fields in the app state:
// `habits` (array of habit names) and `habitEntries` (array of objects with
// date and completed habit indices).
function updateHabitsPage() {
  const state = loadData();
  const today = new Date().toISOString().slice(0, 10);
  let entry = state.habitEntries.find((e) => e.date === today);
  // Ensure an entry exists for today
  if (!entry) {
    entry = { date: today, completed: [] };
    state.habitEntries.push(entry);
    saveData(state);
  }
  const list = document.getElementById('habit-list');
  if (!list) return;
  list.innerHTML = '';
  // Render each habit as a clean liquid-glass row.
  // Tapping toggles completion; completed habits are sorted to the bottom.
  const items = state.habits.map((habit, index) => ({
    habit,
    index,
    done: entry.completed.includes(index),
  }));
  items.sort((a, b) => Number(a.done) - Number(b.done));

  items.forEach(({ habit, index, done }) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'habit-item-card w-full text-left flex items-center justify-between';

    const check = document.createElement('span');
    check.className = 'habit-check' + (done ? ' is-done' : '');
    check.setAttribute('aria-hidden', 'true');
    check.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;

    const name = document.createElement('span');
    name.className = 'habit-name';
    name.textContent = habit;

    const left = document.createElement('div');
    left.className = 'flex items-center gap-3';
    left.appendChild(check);
    left.appendChild(name);

    row.appendChild(left);
    // spacer keeps the right side clean (no extra controls)
    const spacer = document.createElement('span');
    spacer.className = 'sr-only';
    spacer.textContent = done ? 'done' : 'not done';
    row.appendChild(spacer);

    row.addEventListener('click', () => {
      // iOS (especially standalone) can occasionally trigger duplicate events.
      // Keep the completed list strictly unique so toggling always works.
      const has = entry.completed.includes(index);
      if (!has) {
        entry.completed = Array.from(new Set([...entry.completed, index]));
      } else {
        entry.completed = entry.completed.filter((v) => v !== index);
      }
      saveData(state);
      // Re-render so sorting + progress updates instantly.
      updateHabitsPage();
    });

    list.appendChild(row);
  });

  // Determine the most recent lesson note to display as a quote on the streak card.
  const latest = state.reviewEntries
    .filter((r) => r.note && r.note.trim().length > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const quoteElem = document.getElementById('latest-lesson-quote');
  if (quoteElem) {
    if (latest && latest.note) {
      quoteElem.textContent = `“${latest.note}”`;
    } else {
      quoteElem.textContent = '';
    }
  }
  // Render progress bar for current day
  renderHabitProgress(state);
  // Render analytics chart for last 7 days
  updateHabitChart(state);
  // Render heatmap and streak summary for habits
  updateHabitHeatmap(state);
  updateHabitStreaks(state);
  // Render annual progress calendar for habits
  updateHabitCalendar(state);
}

// Draw or update a doughnut chart showing today's habit completion vs remaining.
let habitDonut;
function updateHabitDonut(state) {
  const ctx = document.getElementById('habit-donut');
  if (!ctx) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  const entry = state.habitEntries.find((e) => e.date === todayStr);
  const total = state.habits.length;
  const completed = entry ? entry.completed.length : 0;
  const remaining = total - completed;
  const labels = ['Completed', 'Remaining'];
  const accentStart = getComputedStyle(document.documentElement).getPropertyValue('--accent-start') || '#22c55e';
  const data = {
    labels,
    datasets: [
      {
        data: [completed, remaining < 0 ? 0 : remaining],
        backgroundColor: [accentStart.trim() || '#22c55e', '#374151'],
        borderColor: ['transparent', 'transparent'],
      },
    ],
  };
  const options = {
    cutout: '65%',
    plugins: { legend: { display: false } },
  };
  if (habitDonut) {
    habitDonut.data = data;
    habitDonut.update();
  } else {
    habitDonut = new Chart(ctx, { type: 'doughnut', data, options });
  }
}

// Draw or update a bar chart showing habit completion for the last 7 days.
// Each bar represents the percentage of habits completed on that date.
let habitChart;
function updateHabitChart(state) {
  const ctx = document.getElementById('habit-chart');
  if (!ctx) return;
  const today = new Date();
  // Build arrays of labels (dates) and percentages
  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = state.habitEntries.find((e) => e.date === dateStr);
    const completed = entry ? entry.completed.length : 0;
    const total = state.habits.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    // Format label as day-of-month
    labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    data.push(pct);
  }
  const chartData = {
    labels,
    datasets: [
      {
        label: '% completed',
        data,
        backgroundColor: 'rgba(34,197,94,0.5)',
        borderColor: 'rgba(16,185,129,1)',
        borderWidth: 1,
      },
    ],
  };
  const options = {
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: '#9ca3af',
          callback: (value) => `${value}%`,
        },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };
  // If chart exists, update data; else create new chart
  if (habitChart) {
    habitChart.data = chartData;
    habitChart.update();
  } else {
    habitChart = new Chart(ctx, { type: 'bar', data: chartData, options });
  }
}

// Draw a heatmap representing the last 30 days of habit completion.
// Each cell corresponds to one day and is coloured based on the ratio
// of habits completed (grey for none, varying greens for partial/full).
function updateHabitHeatmap(state) {
  const container = document.getElementById('habit-heatmap');
  if (!container) return;
  container.innerHTML = '';
  const totalHabits = state.habits.length;
  const today = new Date();
  // Prepare 30 entries representing the last 30 days (oldest to newest)
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = state.habitEntries.find((e) => e.date === dateStr);
    const completed = entry ? entry.completed.length : 0;
    const percent = totalHabits > 0 ? completed / totalHabits : 0;
    days.push({ date: dateStr, percent });
  }
  // Create cells (30 cells, wrap automatically by CSS grid)
  days.forEach((dayData) => {
    const cell = document.createElement('div');
    cell.className = 'heat-square';
    let colour = '#374151';
    if (totalHabits > 0) {
      const p = dayData.percent;
      if (p === 0) {
        colour = '#374151';
      } else if (p < 0.34) {
        colour = '#86efac';
      } else if (p < 0.67) {
        colour = '#4ade80';
      } else if (p < 1) {
        colour = '#22c55e';
      } else {
        colour = '#16a34a';
      }
    }
    cell.style.background = colour;
    container.appendChild(cell);
  });
}

// Compute current and longest streaks of full habit completion and update the streaks card.
function updateHabitStreaks(state) {
  // Get separate elements for current and longest streak numbers.
  const currentElem = document.getElementById('habit-streak-current');
  const longestElem = document.getElementById('habit-streak-longest');
  if (!currentElem || !longestElem) return;
  const totalHabits = state.habits.length;
  // When no habits are defined, show zeros.
  if (totalHabits === 0) {
    currentElem.textContent = '0';
    longestElem.textContent = '0';
    return;
  }
  // Sort habit entries by date ascending for correct streak calculations
  const entries = state.habitEntries
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  // Calculate current streak: consecutive days up to today with all habits completed
  let current = 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    // Only consider dates <= today
    if (e.date > todayStr) continue;
    const ratio = totalHabits > 0 ? e.completed.length / totalHabits : 0;
    if (ratio === 1) {
      current++;
    } else {
      break;
    }
  }
  // Calculate longest streak across all recorded entries
  let longest = 0;
  let streak = 0;
  entries.forEach((e) => {
    const ratio = totalHabits > 0 ? e.completed.length / totalHabits : 0;
    if (ratio === 1) {
      streak++;
      if (streak > longest) longest = streak;
    } else {
      streak = 0;
    }
  });
  currentElem.textContent = `${current}`;
  longestElem.textContent = `${longest}`;
}

// Render a full-year calendar grid showing habit completion per day.  Each row
// represents a month (January = top), and columns correspond to days 1–31.  The
// squares are colour coded based on the percentage of habits completed:
// 0% -> dark grey, <25% -> light green, <50% -> medium green, <75% -> deeper
// green, 100% -> full green.  Days beyond a month’s length are left blank.
function updateHabitCalendar(state) {
  const container = document.getElementById('habit-calendar');
  if (!container) return;
  container.innerHTML = '';
  const totalHabits = state.habits.length;
  // Show placeholder if no habits exist
  if (totalHabits === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">Define habits in Settings to see progress.</p>';
    return;
  }
  const now = new Date();
  const year = now.getFullYear();
  // Build a lookup for completion percentage by month and day
  const map = {};
  state.habitEntries.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() !== year) return;
    const m = d.getMonth();
    const day = d.getDate();
    const percent = totalHabits > 0 ? e.completed.length / totalHabits : 0;
    if (!map[m]) map[m] = {};
    map[m][day] = percent;
  });
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Create a row for each month
  for (let m = 0; m < 12; m++) {
    const row = document.createElement('div');
    row.className = 'flex items-center mb-1';
    // Month label
    const label = document.createElement('div');
    label.className = 'w-10 text-xs mr-2 text-gray-400';
    label.textContent = monthNames[m].toUpperCase();
    row.appendChild(label);
    // Day grid
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(31, 0.6rem)';
    grid.style.gap = '2px';
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= 31; d++) {
      const cell = document.createElement('div');
      cell.style.width = '0.6rem';
      cell.style.height = '0.6rem';
      let colour = 'transparent';
      if (d <= daysInMonth) {
        const p = map[m] && map[m][d] != null ? map[m][d] : 0;
        if (p === 0) {
          colour = '#374151';
        } else if (p < 0.25) {
          colour = '#86efac';
        } else if (p < 0.5) {
          colour = '#4ade80';
        } else if (p < 0.75) {
          colour = '#22c55e';
        } else {
          colour = '#16a34a';
        }
      }
      cell.style.background = colour;
      // Round corners slightly to soften the grid
      cell.style.borderRadius = '2px';
      grid.appendChild(cell);
    }
    row.appendChild(grid);
    container.appendChild(row);
  }
}

// Helper to update the habit progress bar and text for today
function renderHabitProgress(state) {
  const bar = document.getElementById('habit-progress-bar');
  const text = document.getElementById('habit-progress-text');
  const today = new Date().toISOString().slice(0, 10);
  const entry = state.habitEntries.find((e) => e.date === today);
  const total = state.habits.length;
  const completed = entry ? entry.completed.length : 0;
  const percent = total > 0 ? (completed / total) * 100 : 0;
  if (bar) {
    bar.style.width = `${percent}%`;
  }
  if (text) {
    text.textContent = total > 0 ? `${completed}/${total} habits completed` : 'No habits defined';
  }
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('calendar-label');
  if (!grid) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const today = now.getDate();
  const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  if (label) label.textContent = monthName;

  // Monday-first alignment
  const first = new Date(year, month, 1);
  const firstDay = (first.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells = [];
  // leading days from prev month
  for (let i = 0; i < firstDay; i++) {
    cells.push({ d: prevDays - firstDay + 1 + i, muted: true, today: false });
  }
  // current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ d, muted: false, today: d === today });
  }
  // trailing to full 6 rows (42)
  while (cells.length < 42) {
    cells.push({ d: cells.length - (firstDay + daysInMonth) + 1, muted: true, today: false });
  }

  grid.innerHTML = '';
  cells.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'cal-cell' + (c.muted ? ' muted' : '') + (c.today ? ' today' : '');
    div.textContent = c.d;
    grid.appendChild(div);
  });
}

// Morning Routine Wizard
let currentStep = 0;
// Holds values for the current morning routine session across steps
// Simplified routine state to capture only the essential discipline data. The
// original fields for sleep/stress/focus/mood are removed because they
// clutter the process and reduce motivation. Instead we focus on plan,
// risk and calm checks plus session intent.
let routineState = {
  checklist: {
    plan: false,
    risk: false,
    calm: false,
  },
};

// Legacy version of the morning routine wizard.  This older definition
// originally handled sleep, stress and mood sliders plus session limits.  It
// remains in the codebase for reference but is not used; the newer
// simplified routine wizard is defined later in this file.  If future
// features require more complex routines, consider refactoring this into a
// separate function and call it explicitly.
function buildRoutineStepOld(step) {
  const container = document.getElementById('routine-steps');
  container.innerHTML = '';
  const state = loadData();
  if (step === 0) {
    // Check-in step with centered layout and custom mood select
    const div = document.createElement('div');
    div.innerHTML = `
      <h2 class="text-lg font-semibold mb-4 text-center">Check-in</h2>
      <div class="space-y-6 max-w-md mx-auto">
        <div>
          <label class="block text-sm mb-1">Sleep quality (1-10)</label>
          <input type="range" id="routine-sleep" min="1" max="10" step="1" value="5" class="w-full" />
          <div id="routine-sleep-value" class="text-center mt-1">5</div>
        </div>
        <div>
          <label class="block text-sm mb-1">Stress (1-10)</label>
          <input type="range" id="routine-stress" min="1" max="10" step="1" value="5" class="w-full" />
          <div id="routine-stress-value" class="text-center mt-1">5</div>
        </div>
        <div>
          <label class="block text-sm mb-1">Focus (1-10)</label>
          <input type="range" id="routine-focus" min="1" max="10" step="1" value="5" class="w-full" />
          <div id="routine-focus-value" class="text-center mt-1">5</div>
        </div>
        <div>
          <label class="block text-sm mb-1">Mood</label>
          <div id="routine-mood-select" class="relative">
            <div id="routine-mood-display" class="select-display flex justify-between items-center">
              <span id="routine-mood-label">Calm</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div id="routine-mood-options" class="select-options absolute w-full hidden z-10 mt-1">
              <div class="select-option px-3 py-2 cursor-pointer" data-value="calm">Calm</div>
              <div class="select-option px-3 py-2 cursor-pointer" data-value="neutral">Neutral</div>
              <div class="select-option px-3 py-2 cursor-pointer" data-value="tilted">Tilted</div>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);
    // update displayed values for sliders
    ['sleep', 'stress', 'focus'].forEach((field) => {
      const input = document.getElementById(`routine-${field}`);
      const valueElem = document.getElementById(`routine-${field}-value`);
      input.addEventListener('input', () => {
        valueElem.textContent = input.value;
      });
    });
    // set up custom mood select event handlers
    const displayEl = document.getElementById('routine-mood-display');
    const labelEl = document.getElementById('routine-mood-label');
    const optionsEl = document.getElementById('routine-mood-options');
    displayEl.addEventListener('click', () => {
      optionsEl.classList.toggle('hidden');
    });
    optionsEl.querySelectorAll('.select-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const value = opt.getAttribute('data-value');
        routineState.mood = value;
        labelEl.textContent = opt.textContent;
        optionsEl.classList.add('hidden');
      });
    });
  } else if (step === 1) {
    // Checklist step
    const div = document.createElement('div');
    div.innerHTML = `
      <h2 class="text-lg font-semibold mb-4 text-center">Pre-trade Checklist</h2>
      <div class="space-y-6 max-w-md mx-auto">
        <label class="flex items-center cursor-pointer">
          <input type="checkbox" id="check-bias" class="custom-checkbox-input" />
          <span class="custom-checkbox"></span>
          <span>Bias clear</span>
        </label>
        <label class="flex items-center cursor-pointer">
          <input type="checkbox" id="check-setup" class="custom-checkbox-input" />
          <span class="custom-checkbox"></span>
          <span>Setup criteria defined</span>
        </label>
        <label class="flex items-center cursor-pointer">
          <input type="checkbox" id="check-risk" class="custom-checkbox-input" />
          <span class="custom-checkbox"></span>
          <span>Risk calculated</span>
        </label>
        <label class="flex items-center cursor-pointer">
          <input type="checkbox" id="check-news" class="custom-checkbox-input" />
          <span class="custom-checkbox"></span>
          <span>News checked</span>
        </label>
        <label class="flex items-center cursor-pointer">
          <input type="checkbox" id="check-revenge" class="custom-checkbox-input" />
          <span class="custom-checkbox"></span>
          <span>No revenge/FOMO</span>
        </label>
      </div>
    `;
    container.appendChild(div);

    // Make both the checkbox *and* its text tappable (iOS-friendly) without
    // breaking native checkbox clicks.
    div.querySelectorAll('label').forEach((label) => {
      const input = label.querySelector('input[type="checkbox"]');
      if (!input) return;

      label.addEventListener('click', (e) => {
        // If the user clicked the actual checkbox, let the browser handle it.
        if (e.target === input) return;
        // Otherwise, toggle via a programmatic click (works for text + icon taps).
        e.preventDefault();
        input.click();
      });
    });

  } else if (step === 2) {
    // Intent step
    const div = document.createElement('div');
    div.innerHTML = `
      <h2 class="text-lg font-semibold mb-4 text-center">Session Intent</h2>
      <div class="space-y-6 max-w-md mx-auto">
        <div>
          <label class="block text-sm mb-1" for="intent-maxtrades">Max trades today</label>
          <input id="intent-maxtrades" type="number" />
        </div>
        <div>
          <label class="block text-sm mb-1" for="intent-maxloss">Max loss ($)</label>
          <input id="intent-maxloss" type="number" />
        </div>
        <div>
          <label class="block text-sm mb-1">Session</label>
          <div id="intent-session-select" class="relative">
            <div id="intent-session-display" class="select-display flex justify-between items-center">
              <span id="intent-session-label">London</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div id="intent-session-options" class="select-options absolute w-full hidden z-10 mt-1">
              <div class="select-option px-3 py-2 cursor-pointer" data-value="london">London</div>
              <div class="select-option px-3 py-2 cursor-pointer" data-value="ny">New York</div>
              <div class="select-option px-3 py-2 cursor-pointer" data-value="both">Both</div>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);
    // set up custom session select events after element is added
    const sessionDisplay = document.getElementById('intent-session-display');
    const sessionLabel = document.getElementById('intent-session-label');
    const sessionOptions = document.getElementById('intent-session-options');
    sessionDisplay.addEventListener('click', () => {
      sessionOptions.classList.toggle('hidden');
    });
    sessionOptions.querySelectorAll('.select-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        const value = opt.getAttribute('data-value');
        routineState.intent.session = value;
        sessionLabel.textContent = opt.textContent;
        sessionOptions.classList.add('hidden');
      });
    });
  } else if (step === 3) {
    // Finish step
    const div = document.createElement('div');
    div.className = 'text-center space-y-4';
    div.innerHTML = `
      <h2 class="text-2xl font-semibold">Good Morning!</h2>
      <p>Your session is ON. Get ready to trade with discipline!</p>
      <button id="routine-finish" class="px-4 py-2 accent-btn">Go to Home</button>
    `;
    container.appendChild(div);
    document
      .getElementById('routine-finish')
      .addEventListener('click', () => {
        showPage('home');
      });
  }
  // show/hide back and next buttons
  const backBtn = document.getElementById('routine-back');
  const nextBtn = document.getElementById('routine-next');
  if (step === 0) {
    backBtn.classList.add('hidden');
    nextBtn.textContent = 'Next';
  } else if (step === 3) {
    backBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
  } else if (step === 2) {
    backBtn.classList.remove('hidden');
    nextBtn.textContent = 'Finish';
    nextBtn.classList.remove('hidden');
  } else {
    backBtn.classList.remove('hidden');
    nextBtn.textContent = 'Next';
    nextBtn.classList.remove('hidden');
  }
}

function saveMorningEntry() {
  const state = loadData();
  // Persist only the simplified routine fields; exclude sleep/stress/focus/mood for clarity
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    checklist: { ...routineState.checklist },
  };
  state.morningEntries.push(entry);
  saveData(state);
}

// Render the full lessons overview page.  This builds a list of all notes from
// evening reviews, sorted by most recent.  Each lesson is displayed in a
// card with the date and the note content.  Called when navigating to the
// lessons page.
function updateLessonsPage() {
  const container = document.getElementById('all-lessons-container');
  if (!container) return;
  const state = loadData();
  container.innerHTML = '';
  const notes = state.reviewEntries
    .filter((r) => r.note && r.note.trim().length > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (notes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-center text-gray-400';
    empty.textContent = 'No lessons recorded yet.';
    container.appendChild(empty);
    return;
  }
  notes.forEach((r) => {
    // Create a stylish card for each lesson.  Cards use a tinted background and
    // coloured indicator bar on the left to distinguish between plan‑followed and
    // rule‑break entries.  This layout is inspired by research lists in premium
    // dashboards: clean, spacious and easy to scan.
    const card = document.createElement('div');
    // Base glass styling plus slight tint for readability
    card.className = 'glass p-4 rounded-xl flex flex-col';
    card.style.background = 'rgba(255, 255, 255, 0.04)';
    // Create a coloured bar on the left to indicate status
    const statusBar = document.createElement('div');
    statusBar.style.width = '4px';
    statusBar.style.borderRadius = '4px';
    statusBar.style.marginRight = '0.75rem';
    statusBar.style.backgroundColor = r.followed ? '#047857' : '#b91c1c';
    // Wrap header elements in a flex container
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';
    const date = new Date(r.date);
    const dateSpan = document.createElement('span');
    dateSpan.className = 'text-sm text-gray-400';
    dateSpan.textContent = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const statusLabel = document.createElement('span');
    statusLabel.className = 'text-xs px-2 py-1 rounded-full';
    if (r.followed) {
      statusLabel.textContent = 'Plan followed';
      statusLabel.style.backgroundColor = '#047857';
    } else {
      statusLabel.textContent = 'Rule break';
      statusLabel.style.backgroundColor = '#b91c1c';
    }
    header.appendChild(dateSpan);
    header.appendChild(statusLabel);
    const noteP = document.createElement('p');
    noteP.className = 'text-base';
    noteP.textContent = r.note;
    // Build the row: left bar + content
    const row = document.createElement('div');
    row.className = 'flex';
    row.appendChild(statusBar);
    const content = document.createElement('div');
    content.className = 'flex-1';
    content.appendChild(header);
    content.appendChild(noteP);
    row.appendChild(content);
    card.appendChild(row);
    container.appendChild(card);
  });
}

// Build the activity overview page.  This compiles all morning routines and
// evening reviews into a unified list, sorted by most recent date.  Each
// entry is displayed in a card with a coloured status bar on the left and
// descriptive text.  Morning routines are shown in green; reviews are green
// if the plan was followed and red if a rule was broken.  Called when
// navigating to the activity page.
function updateActivityPage() {
  const container = document.getElementById('activity-list');
  if (!container) return;
  const state = loadData();
  // Combine morning and review entries into a single array.  Keep references
  // to the original entry objects so we can display details later.
  const combined = [];
  state.morningEntries.forEach((e) => combined.push({ type: 'morning', entry: e }));
  state.reviewEntries.forEach((e) => combined.push({ type: 'review', entry: e }));
  // Sort by date descending
  combined.sort((a, b) => new Date(b.entry.date) - new Date(a.entry.date));
  container.innerHTML = '';
  if (combined.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-center text-gray-400';
    empty.textContent = 'No activity yet.';
    container.appendChild(empty);
    return;
  }
  combined.forEach((item) => {
    const { type, entry } = item;
    // Create card container
    const card = document.createElement('div');
    card.className = 'glass p-4 rounded-xl flex';
    // Create coloured status bar
    const statusBar = document.createElement('div');
    statusBar.style.width = '4px';
    statusBar.style.borderRadius = '4px';
    statusBar.style.marginRight = '0.75rem';
    // Determine colour
    let colour = '#047857'; // default green
    if (type === 'review') {
      colour = entry.followed ? '#047857' : '#b91c1c';
    }
    statusBar.style.backgroundColor = colour;
    // Build content area
    const content = document.createElement('div');
    content.className = 'flex-1';
    // Header: date and type badge
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-1';
    const date = new Date(entry.date);
    const dateSpan = document.createElement('span');
    dateSpan.className = 'text-sm text-gray-400';
    dateSpan.textContent = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    // Type badge
    const badge = document.createElement('span');
    badge.className = 'text-xs px-2 py-1 rounded-full';
    if (type === 'morning') {
      badge.textContent = 'Morning Routine';
      badge.style.backgroundColor = '#047857';
    } else {
      badge.textContent = entry.followed ? 'Review (Plan)' : 'Review (Rule Break)';
      badge.style.backgroundColor = entry.followed ? '#047857' : '#b91c1c';
    }
    header.appendChild(dateSpan);
    header.appendChild(badge);
    // Body content
    const body = document.createElement('div');
    body.className = 'mt-1 text-sm';
    if (type === 'morning') {
      // Summarise the checklist.  Show which items were checked.  Map keys to descriptive text.
      const checks = [];
      if (entry.checklist.plan) checks.push('Plan clear');
      if (entry.checklist.risk) checks.push('Risk defined');
      if (entry.checklist.calm) checks.push('Calm & focused');
      body.textContent = checks.join(', ');
    } else {
      // Summarise review: trades and PnL
      const trades = entry.trades;
      const pnl = entry.pnl;
      const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
      const summary = `Trades: ${trades}, P&L: ${pnlStr}`;
      // If a rule break occurred, mention it.
      if (!entry.followed && entry.ruleBreak) {
        body.textContent = `${summary}, Broke rule: ${entry.ruleBreak}`;
      } else {
        body.textContent = summary;
      }
    }
    // Append children
    content.appendChild(header);
    content.appendChild(body);
    card.appendChild(statusBar);
    card.appendChild(content);
    container.appendChild(card);
  });
}

// Override the routine wizard with a simplified flow. Step 0: three yes/no
// pre‑session checks (plan, risk, calm). Step 1: set session limits (max trades,
// max loss, session). Step 2: final message with a button to start the
// session and persist the entry.
function buildRoutineStep(step) {
  const container = document.getElementById('routine-steps');
  container.innerHTML = '';
  if (step === 0) {
    // Pre-session check: ask three questions about plan, risk and state
    const div = document.createElement('div');
    // Build a neatly styled checklist. Each item is wrapped in a card-like row
    div.innerHTML = `
      <h2 class="text-lg font-semibold mb-4 text-center">Pre‑session Check</h2>
      <div class="space-y-3 max-w-md mx-auto">
        <div class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <input type="checkbox" id="pre-plan" class="w-4 h-4 form-checkbox" />
          <span>Plan is clear?</span>
        </div>
        <div class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <input type="checkbox" id="pre-risk" class="w-4 h-4 form-checkbox" />
          <span>Risk defined?</span>
        </div>
        <div class="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <input type="checkbox" id="pre-calm" class="w-4 h-4 form-checkbox" />
          <span>Calm &amp; focused?</span>
        </div>
      </div>
    `;
    container.appendChild(div);
    // Navigation buttons: hide back, show next
    const backBtn = document.getElementById('routine-back');
    const nextBtn = document.getElementById('routine-next');
    if (backBtn) backBtn.classList.add('hidden');
    if (nextBtn) {
      nextBtn.textContent = 'Next';
      nextBtn.classList.remove('hidden');
    }
  } else if (step === 1) {
    // Quote & discipline reminder step
    const quote = dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)];
    const div = document.createElement('div');
    div.innerHTML = `
      <h2 class="text-lg font-semibold mb-4 text-center">Discipline Reminder</h2>
      <div class="space-y-6 max-w-md mx-auto">
        <p class="text-center text-xl italic">&ldquo;${quote}&rdquo;</p>
        <p class="text-center text-sm text-gray-400">Remember, you're doing this to become a disciplined trader.</p>
      </div>
    `;
    container.appendChild(div);
    // Show back and change next button to Finish
    const backBtn = document.getElementById('routine-back');
    const nextBtn = document.getElementById('routine-next');
    if (backBtn) backBtn.classList.remove('hidden');
    if (nextBtn) {
      nextBtn.textContent = 'Finish';
      nextBtn.classList.remove('hidden');
    }
  } else {
    // Final step: simple confirmation to start the session
    const div = document.createElement('div');
    div.innerHTML = `
      <h2 class="text-lg font-semibold mb-2 text-center">All set!</h2>
      <p class="text-sm text-gray-400 text-center mb-4">Follow your plan and stay disciplined.</p>
      <div class="flex justify-center">
        <button id="finish-routine" class="px-5 py-3 accent-btn rounded-xl">Start Session</button>
      </div>
    `;
    container.appendChild(div);
    document.getElementById('finish-routine').addEventListener('click', () => {
      saveMorningEntry();
      currentStep = 0;
      showPage('home');
      updateHomePage();
      updateAnalytics(currentRange);
    });
    // Hide external navigation buttons on final step
    const backBtn = document.getElementById('routine-back');
    const nextBtn = document.getElementById('routine-next');
    if (backBtn) backBtn.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
  }
}

// Setup navigation event listeners
let currentPage = 'home';
document.querySelectorAll('.nav-link').forEach((btn) => {
  btn.addEventListener('click', () => {
    const page = btn.getAttribute('data-page');
    // Strict mode: prevent going to review page if no morning entry today
    if (page === 'review') {
      const state = loadData();
      if (state.strict) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const morningToday = state.morningEntries.find((e) => e.date.startsWith(todayStr));
        if (!morningToday) {
          // In strict mode, notify via console rather than blocking alert
          console.log('Strict mode: please complete your morning routine first.');
          return;
        }
      }
    }
    showPage(page);
  });
});

// When the recent lessons card on the home page is clicked, show the
// full lessons overview page.  This lets users review all past notes in a
// dedicated view.
document.addEventListener('DOMContentLoaded', () => {
  const lessonsCard = document.getElementById('lessons-card');
  if (lessonsCard) {
    lessonsCard.addEventListener('click', () => {
      showPage('lessons');
      updateLessonsPage();
    });
  }
});

// Quick action buttons behave like nav links
document.querySelectorAll('.quick-action').forEach((btn) => {
  btn.addEventListener('click', () => {
    const page = btn.getAttribute('data-page');
    // reuse nav logic
    const navButton = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (navButton) navButton.click();
  });
});

// Start streak button navigates to the page defined in its data-page attribute
document.getElementById('start-streak').addEventListener('click', () => {
  const btn = document.getElementById('start-streak');
  const page = btn.getAttribute('data-page');
  if (page) {
    const navButton = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (navButton) navButton.click();
  }
});

// Secondary streak button (contextual)
const secondaryStreakBtn = document.getElementById('secondary-streak');
if (secondaryStreakBtn) {
  secondaryStreakBtn.addEventListener('click', () => {
    const page = secondaryStreakBtn.getAttribute('data-page');
    if (page) {
      const navButton = document.querySelector(`.nav-link[data-page="${page}"]`);
      if (navButton) navButton.click();
    }
  });
}

// Morning routine navigation logic
document.getElementById('routine-back').addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep--;
    buildRoutineStep(currentStep);
  }
});
document.getElementById('routine-next').addEventListener('click', () => {
  if (currentStep === 0) {
    // Capture values from the pre‑session check
    routineState.checklist.plan = document.getElementById('pre-plan').checked;
    routineState.checklist.risk = document.getElementById('pre-risk').checked;
    routineState.checklist.calm = document.getElementById('pre-calm').checked;
    currentStep++;
    buildRoutineStep(currentStep);
  } else if (currentStep === 1) {
    // Move directly to the final step (quote already shown)
    currentStep++;
    buildRoutineStep(currentStep);
  } else {
    // Final step: save and reset
    saveMorningEntry();
    currentStep = 0;
    showPage('home');
    updateHomePage();
    updateAnalytics(currentRange);
  }
});

// Review form logic
document.getElementById('review-trades').addEventListener('input', (e) => {
  document.getElementById('review-trades-value').textContent = e.target.value;
});

// iOS-friendly: make the whole "Followed your plan?" row tappable, not just the
// small checkbox.
(() => {
  const row = document.getElementById('review-follow-row');
  const input = document.getElementById('review-follow');
  if (!row || !input) return;

  row.addEventListener('click', (e) => {
    // If the user taps the checkbox itself, let native behaviour work.
    if (e.target === input) return;
    // Otherwise, make the whole row (text, whitespace) toggle the checkbox.
    e.preventDefault();
    input.click();
  });
})();

document.getElementById('review-follow').addEventListener('change', (e) => {
  document.getElementById('rule-break-container').classList.toggle('hidden', e.target.checked);
});

document.getElementById('review-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const trades = Number(document.getElementById('review-trades').value);
  const pnl = parseFloat(document.getElementById('review-pnl').value) || 0;
  const followed = document.getElementById('review-follow').checked;
  const ruleBreak = followed ? '' : selectedReviewRule;
  // Consolidated reflection note instead of separate good/bad/lesson fields
  const noteElem = document.getElementById('review-note');
  const note = noteElem ? noteElem.value.trim() : '';
  // Determine session color
  let color = 'green';
  const state = loadData();
  // find today's morning intent if exists
  // Determine session color without intent data: yellow if plan not followed,
  // red if plan not followed and trades exceed 5
  if (!followed) {
    color = 'yellow';
    if (trades > 5) {
      color = 'red';
    }
  }
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    trades,
    pnl,
    followed,
    ruleBreak,
    note,
    sessionColor: color,
  };
  state.reviewEntries.push(entry);
  saveData(state);
  // Reset form
  e.target.reset();
  document.getElementById('review-trades-value').textContent = '0';
  document.getElementById('rule-break-container').classList.add('hidden');
  // Update views
  loadReviewList();
  updateHomePage();
  updateAnalytics(currentRange);
  // Navigate back to the dashboard after saving a review
  showPage('home');
  // Avoid intrusive browser pop‑ups; reviews are saved silently
  console.log('Review saved.');
});

// Load review list (last 7 entries)
function loadReviewList() {
  const state = loadData();
  const list = document.getElementById('review-list');
  // If there is no review list container or it is hidden, skip rendering past reviews.
  if (!list || list.classList.contains('hidden')) return;
  list.innerHTML = '';
  const entries = [...state.reviewEntries];
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  entries.slice(0, 7).forEach((r) => {
    const div = document.createElement('div');
    div.className = 'glass p-3 rounded-lg flex justify-between items-center';
    const date = new Date(r.date);
    div.innerHTML = `
      <div>
        <p class="font-semibold">${date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}</p>
        <p class="text-xs text-gray-400">Trades: ${r.trades}</p>
      </div>
      <span class="text-${r.sessionColor}-400 font-bold capitalize">${r.sessionColor}</span>
    `;
    list.appendChild(div);
  });
}

// Analytics
let equityChart;
let complianceChart;
let rulesChart;
let currentRange = 'week';

// Global variable to hold selected rule for review drop-down
let selectedReviewRule = 'impulse';

// Initialize custom review-rule select interactions
function initReviewRuleSelect() {
  const display = document.getElementById('review-rule-display');
  const label = document.getElementById('review-rule-label');
  const options = document.getElementById('review-rule-options');
  if (!display || !label || !options) return;
  display.addEventListener('click', () => {
    options.classList.toggle('hidden');
  });
  options.querySelectorAll('.select-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      selectedReviewRule = opt.getAttribute('data-value');
      label.textContent = opt.textContent;
      options.classList.add('hidden');
    });
  });
}

function computeRangeFilter(range) {
  const now = new Date();
  if (range === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === 'month') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // last 3 months
    return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
}


async function updateAnalytics(range) {
  const state = loadData();
  const fromDate = computeRangeFilter(range);
  // Filter review entries by date
  const reviews = state.reviewEntries.filter(
    (r) => new Date(r.date) >= fromDate
  );
  // Filter morning entries
  const mornings = state.morningEntries.filter(
    (m) => new Date(m.date) >= fromDate
  );
  // Plan compliance and average PnL
  const totalReviews = reviews.length;
  let totalFollowed = 0;
  let totalTrades = 0;
  let totalPnl = 0;
  const ruleCounts = {};
  reviews.forEach((r) => {
    if (r.followed) totalFollowed++;
    totalTrades += r.trades;
    totalPnl += Number(r.pnl);
    if (r.ruleBreak) {
      ruleCounts[r.ruleBreak] = (ruleCounts[r.ruleBreak] || 0) + 1;
    }
  });
  const compliance = totalReviews > 0 ? (totalFollowed / totalReviews) * 100 : 0;
  const avgPnl = totalReviews > 0 ? totalPnl / totalReviews : 0;
  document.getElementById('analytics-compliance').textContent = `${displayCompliance.toFixed(
    1
  )}%`;
  document.getElementById('analytics-sessions').textContent = mornings.length;
  document.getElementById('analytics-trades').textContent = displayTrades;
  document.getElementById('analytics-avgpnl').textContent = `$${displayPnl.toFixed(2)}`;
  // Optionally display win rate if a DOM element exists (added in HTML)
  const winEl = document.getElementById('analytics-winrate');
  if (winEl) {
    if (displayWinrate != null) {
      winEl.textContent = `${displayWinrate.toFixed(1)}%`;
    } else {
      winEl.textContent = '—';
    }
  }
  // Equity curve: compute cumulative % returns (we treat pnl as dollar, but use relative to base capital of 1k for demonstration)
  let capital = 1000;
  const eqLabels = [];
  const eqData = [];
  reviews
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((r) => {
      capital += Number(r.pnl);
      const pct = ((capital - 1000) / 1000) * 100;
      eqLabels.push(new Date(r.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }));
      eqData.push(pct);
    });
  // Plan compliance over time: group by week number/month
  const compLabels = [];
  const compData = [];
  if (reviews.length > 0) {
    const grouped = {};
    reviews.forEach((r) => {
      const d = new Date(r.date);
      let key;
      if (range === 'week') {
        // day label
        key = d.toLocaleDateString(undefined, { weekday: 'short' });
      } else if (range === 'month') {
        key = `Week ${getWeekNumber(d)}`;
      } else {
        // three months: group by month
        key = d.toLocaleDateString(undefined, { month: 'short' });
      }
      if (!grouped[key]) grouped[key] = { total: 0, follow: 0 };
      grouped[key].total++;
      if (r.followed) grouped[key].follow++;
    });
    Object.keys(grouped).forEach((key) => {
      compLabels.push(key);
      compData.push((grouped[key].follow / grouped[key].total) * 100);
    });
  }
  // Rule break distribution
  const ruleLabels = Object.keys(ruleCounts);
  const ruleData = ruleLabels.map((k) => ruleCounts[k]);
  // Create or update charts
  const eqCtx = document.getElementById('chart-equity').getContext('2d');
  const compCtx = document.getElementById('chart-compliance').getContext('2d');
  const rulesCtx = document.getElementById('chart-rules').getContext('2d');
  if (equityChart) {
    equityChart.data.labels = eqLabels;
    equityChart.data.datasets[0].data = eqData;
    equityChart.update();
  } else {
    equityChart = new Chart(eqCtx, {
      type: 'line',
      data: {
        labels: eqLabels,
        datasets: [
          {
            label: 'Equity %',
            data: eqData,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96,165,250,0.2)',
            tension: 0.2,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#d1d5db' },
            grid: { color: 'rgba(255,255,255,0.1)' },
          },
          x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }
  if (complianceChart) {
    complianceChart.data.labels = compLabels;
    complianceChart.data.datasets[0].data = compData;
    complianceChart.update();
  } else {
    complianceChart = new Chart(compCtx, {
      type: 'bar',
      data: {
        labels: compLabels,
        datasets: [
          {
            label: 'Compliance %',
            data: compData,
            backgroundColor: '#34d399',
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.1)' } },
          x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }
  if (rulesChart) {
    rulesChart.data.labels = ruleLabels;
    rulesChart.data.datasets[0].data = ruleData;
    rulesChart.update();
  } else {
    rulesChart = new Chart(rulesCtx, {
      type: 'bar',
      data: {
        labels: ruleLabels,
        datasets: [
          {
            label: 'Rule Breaks',
            data: ruleData,
            backgroundColor: '#f87171',
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.1)' } },
          x: { ticks: { color: '#d1d5db' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  // Plan compliance distribution donut chart
  const donutCtxElem = document.getElementById('chart-compliance-donut');
  if (donutCtxElem) {
    const donutCtx = donutCtxElem.getContext('2d');
    const followed = totalFollowed;
    const notFollowed = totalReviews - totalFollowed;
    const accentStart = getComputedStyle(document.documentElement).getPropertyValue('--accent-start').trim() || '#3b82f6';
    const data = {
      labels: ['Followed', 'Not Followed'],
      datasets: [
        {
          data: [followed, notFollowed < 0 ? 0 : notFollowed],
          backgroundColor: [accentStart || '#3b82f6', '#374151'],
          borderColor: ['transparent', 'transparent'],
        },
      ],
    };
    const options = {
      cutout: '65%',
      plugins: { legend: { display: false } },
    };
    if (window.complianceDonutChart) {
      window.complianceDonutChart.data = data;
      window.complianceDonutChart.update();
    } else {
      window.complianceDonutChart = new Chart(donutCtx, { type: 'doughnut', data, options });
    }
  }
}

// Helper to get week number within month for grouping compliance by week
function getWeekNumber(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil(((date - firstDay) / (1000 * 60 * 60 * 24) + firstDay.getDay() + 1) / 7);
}

// Time filter buttons
function setActiveRangeButtons(range) {
  document.querySelectorAll('.time-filter').forEach((b) => {
    if (b.getAttribute('data-range') === range) b.classList.add('active');
    else b.classList.remove('active');
  });
}

document.querySelectorAll('.time-filter').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentRange = btn.getAttribute('data-range');
    setActiveRangeButtons(currentRange);
    updateAnalytics(currentRange);
  });
});

// Settings
function loadSettings() {
  const state = loadData();
  // Populate rules list
  const list = document.getElementById('rules-list');
  list.innerHTML = '';
  state.rules.forEach((rule, index) => {
    const div = document.createElement('div');
    div.className = 'flex items-center';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = rule;
    input.className = 'flex-1 p-2 bg-gray-800 border border-gray-700 rounded';
    input.addEventListener('change', () => {
      state.rules[index] = input.value;
      saveData(state);
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.className = 'ml-2 px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded';
    delBtn.addEventListener('click', () => {
      state.rules.splice(index, 1);
      saveData(state);
      loadSettings();
    });
    div.appendChild(input);
    div.appendChild(delBtn);
    list.appendChild(div);
  });
  // Populate limits
  document.getElementById('settings-maxtrades').value = state.limits.maxTrades;
  document.getElementById('settings-maxloss').value = state.limits.maxLoss;
  document.getElementById('settings-strict').checked = state.strict;

  // Load and display habits management list
  loadManageHabits();
}

// Manage habits in settings
function loadManageHabits() {
  const state = loadData();
  const list = document.getElementById('settings-habits-list');
  if (!list) return;
  list.innerHTML = '';
  state.habits.forEach((habit, index) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = habit;
    input.className = 'flex-1 p-2 bg-gray-800 border border-gray-700 rounded';
    input.addEventListener('change', () => {
      const s = loadData();
      s.habits[index] = input.value;
      saveData(s);
      updateHabitsPage();
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.className = 'px-2 py-1 text-red-400 hover:text-red-300';
    delBtn.addEventListener('click', () => {
      if (confirm(`Delete habit "${habit}"?`)) {
        const s = loadData();
        s.habits.splice(index, 1);
        // adjust habitEntries
        s.habitEntries.forEach((e) => {
          const pos = e.completed.indexOf(index);
          if (pos !== -1) e.completed.splice(pos, 1);
          e.completed = e.completed.map((i) => (i > index ? i - 1 : i));
        });
        saveData(s);
        loadManageHabits();
        updateHabitsPage();
      }
    });
    row.appendChild(input);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

// Add new habit from settings
const addSettingsHabitBtn = document.getElementById('add-settings-habit');
if (addSettingsHabitBtn) {
  addSettingsHabitBtn.addEventListener('click', () => {
    const state = loadData();
    const input = document.getElementById('new-settings-habit');
    if (input) {
      const val = input.value.trim();
      if (val) {
        state.habits.push(val);
        // Add a checkbox entry for each date
        saveData(state);
        input.value = '';
        loadManageHabits();
        updateHabitsPage();
      }
    }
  });
}

// Add rule
document.getElementById('add-rule').addEventListener('click', () => {
  const state = loadData();
  const val = document.getElementById('new-rule').value.trim();
  if (val) {
    state.rules.push(val);
    saveData(state);
    document.getElementById('new-rule').value = '';
    loadSettings();
  }
});

// Clock and gold price updates on the home page
function updateClock() {
  const clockElem = document.getElementById('clock');
  if (!clockElem) return;
  function refreshTime() {
    const now = new Date();
    // Format as HH:MM:SS in user's locale
    clockElem.textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  refreshTime();
  setInterval(refreshTime, 1000);
}

async function updateGoldPrice() {
  const priceElem = document.getElementById('gold-price');
  if (!priceElem) return;
  try {
    // Fetch live XAU price in USD from a public endpoint.  The API returns
    // the price per ounce in US dollars.  We display this value directly
    // (around $4,500/oz in late 2025) without applying any arbitrary
    // divisor.  If the API structure changes, the xauPrice may need
    // adjustment.
    const res = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
    const json = await res.json();
    const xauPrice = json.items && json.items.length ? json.items[0].xauPrice : null;
    if (xauPrice) {
      priceElem.textContent = `Gold: $${Number(xauPrice).toFixed(2)}`;
    } else {
      priceElem.textContent = 'Gold: --';
    }
  } catch (e) {
    // In case of network errors, show fallback
    priceElem.textContent = 'Gold: --';
  }
}

// Initialize clock and price once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  updateGoldPrice();
  // Refresh the gold price every 5 minutes
  setInterval(updateGoldPrice, 300000);

  // Top bar menu toggle and logo navigation
  // Set up drop‑down navigation for the top bar.  We avoid using Tailwind's
  // `hidden` class here to ensure inline styles can toggle display reliably.
  const menuToggle = document.getElementById('menu-toggle');
  const dropdownNav = document.getElementById('dropdown-nav');
  if (menuToggle && dropdownNav) {
    menuToggle.addEventListener('click', () => {
      // Toggle between 'none' and 'flex' to show/hide the menu
      const isHidden = dropdownNav.style.display === 'none' || dropdownNav.style.display === '';
      dropdownNav.style.display = isHidden ? 'flex' : 'none';
    });
  }
  const logoElem = document.getElementById('logo');
  if (logoElem) {
    logoElem.addEventListener('click', () => {
      showPage('home');
      // Hide the drop‑down on navigation back to home
      if (dropdownNav && dropdownNav.style.display !== 'none') {
        dropdownNav.style.display = 'none';
      }
    });
  }
  // When a link in the drop‑down is clicked, hide the menu so it doesn't remain open
  if (dropdownNav) {
    dropdownNav.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        dropdownNav.style.display = 'none';
      });
    });
  }

  // Attach click handler for the "View All Lessons" button in the streak card.
  const viewLessonsBtn = document.getElementById('view-lessons');
  if (viewLessonsBtn) {
    viewLessonsBtn.addEventListener('click', () => {
      showPage('lessons');
    });
  }
});

// Update limits and strict mode when inputs change
// Attach settings event listeners after the DOM is ready.  Wrapping these in
// DOMContentLoaded ensures the elements exist before accessing them, which
// prevents runtime errors that would otherwise break other interactions.
document.addEventListener('DOMContentLoaded', () => {
  const maxTradesInput = document.getElementById('settings-maxtrades');
  const maxLossInput = document.getElementById('settings-maxloss');
  const strictInput = document.getElementById('settings-strict');
  const exportBtn = document.getElementById('export-data');
  if (maxTradesInput) {
    maxTradesInput.addEventListener('change', (e) => {
      const state = loadData();
      state.limits.maxTrades = e.target.value;
      saveData(state);
    });
  }
  if (maxLossInput) {
    maxLossInput.addEventListener('change', (e) => {
      const state = loadData();
      state.limits.maxLoss = e.target.value;
      saveData(state);
    });
  }
  if (strictInput) {
    strictInput.addEventListener('change', (e) => {
      const state = loadData();
      state.strict = e.target.checked;
      saveData(state);
    });
  }
  // Export data
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const state = loadData();
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading-pal-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
});

// Initialize habit tracker on page load.  This handler sets up the daily
// habits list, progress bar, analytics chart and the add-habit button.  It is
// separate from other DOMContentLoaded handlers to isolate habit logic.
document.addEventListener('DOMContentLoaded', () => {
  // Always prepare today's entry and render the habit list, heatmap, streaks and charts
  updateHabitsPage();
  // Habit management (add/remove) is handled exclusively via the Settings page.
});

// Attach accordion toggle functionality for the settings page.
document.addEventListener('DOMContentLoaded', () => {
  // Each settings-toggle controls visibility of its following settings-content.
  document.querySelectorAll('.settings-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      const content = toggle.parentElement.querySelector('.settings-content');
      if (content) {
        content.classList.toggle('hidden');
      }
    });
  });
});

// Make the "This Week" stats card on the dashboard clickable to open the
// analytics page. Attach this listener once after the DOM is ready.
document.addEventListener('DOMContentLoaded', () => {
  const weekCard = document.getElementById('week-card');
  if (weekCard) {
    weekCard.addEventListener('click', () => {
      showPage('analytics');
    });
  }
});

// Reset data (safe on local + deployed)
function resetAllData() {
  localStorage.setItem('disableSampleData', 'true'); // prevents demo data from repopulating after reset
  localStorage.removeItem('tradingPalData');
  localStorage.removeItem('sampleDataGenerated');
  localStorage.removeItem('quoteDate');
  localStorage.removeItem('dailyQuote');

  // Reset charts (guarded)
  try {
    if (equityChart) { equityChart.destroy(); equityChart = null; }
    if (complianceChart) { complianceChart.destroy(); complianceChart = null; }
    if (rulesChart) { rulesChart.destroy(); rulesChart = null; }
    if (habitChart) { habitChart.destroy(); habitChart = null; }
    if (habitDonut) { habitDonut.destroy(); habitDonut = null; }
  } catch (e) {
    console.warn('Chart reset failed:', e);
  }

  // Navigate + rerender clean state
  showPage('home');
  updateHomePage();
  loadReviewList();
  updateAnalytics(currentRange);
  loadSettings();
}

document.addEventListener('DOMContentLoaded', () => {
  const resetBtn = document.getElementById('reset-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
        resetAllData();
      }
    });
  }
});

// Initial load
window.addEventListener('load', () => {
  updateHomePage();
  buildRoutineStep(0);
  loadReviewList();
  updateAnalytics(currentRange);
  loadSettings();
  // initialise custom review rule select once DOM is loaded
  initReviewRuleSelect();
  // show home by default
  showPage('home');
});

// -----------------------------------------------------------------------------
// Supabase Sync (personal use) – keeps tradingPalData in sync across devices.
// Only activates if URL + anon key are configured in Settings.
// -----------------------------------------------------------------------------
(function () {
  const LS_URL = 'tp_supabase_url';
  const LS_KEY = 'tp_supabase_key';
  const LS_EMAIL = 'tp_supabase_email';
  const DATA_KEY = 'tradingPalData';
  const TABLE = 'trading_pal_data';

  let client = null;
  let userId = null;
  let channel = null;
  let pushTimer = null;
  let lastPushedAt = 0;
  let applyingRemote = false;

  function nowIso() { return new Date().toISOString(); }

  function getCfg() {
    return {
      url: (localStorage.getItem(LS_URL) || '').trim(),
      key: (localStorage.getItem(LS_KEY) || '').trim(),
      email: (localStorage.getItem(LS_EMAIL) || '').trim(),
    };
  }

  function setStatus(msg) {
    const el = document.getElementById('sync-status');
    if (el) el.textContent = msg;
  }

  function isConfigured(cfg) {
    return cfg && cfg.url && cfg.key && cfg.url.startsWith('http');
  }

  function safeJsonParse(s, fallback) {
    try { return JSON.parse(s); } catch { return fallback; }
  }

  function localState() {
    return safeJsonParse(localStorage.getItem(DATA_KEY) || '{}', {});
  }

  function withMeta(state) {
    const copy = JSON.parse(JSON.stringify(state || {}));
    copy.__updatedAt = nowIso();
    return copy;
  }

  function stripMeta(state) {
    if (!state || typeof state !== 'object') return state;
    const copy = JSON.parse(JSON.stringify(state));
    delete copy.__updatedAt;
    return copy;
  }

  async function initClient() {
    const cfg = getCfg();
    if (!isConfigured(cfg)) {
      client = null; userId = null;
      setStatus('not configured');
      return null;
    }
    if (!window.supabase || !window.supabase.createClient) {
      setStatus('Supabase SDK missing');
      return null;
    }

    client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

    // UI fill
    const urlEl = document.getElementById('sync-supabase-url');
    const keyEl = document.getElementById('sync-supabase-key');
    const emailEl = document.getElementById('sync-email');
    if (urlEl && !urlEl.value) urlEl.value = cfg.url;
    if (keyEl && !keyEl.value) keyEl.value = cfg.key;
    if (emailEl && !emailEl.value) emailEl.value = cfg.email;

    // Detect session
    const { data: sessData } = await client.auth.getSession();
    userId = sessData && sessData.session && sessData.session.user ? sessData.session.user.id : null;

    if (userId) {
      setStatus('connected');
      await ensureRealtime();
    } else {
      setStatus('configured (signed out)');
    }

    // Keep status updated
    client.auth.onAuthStateChange(async (_event, session) => {
      userId = session && session.user ? session.user.id : null;
      if (userId) {
        setStatus('connected');
        await ensureRealtime();
      } else {
        setStatus('configured (signed out)');
        await teardownRealtime();
      }
    });

    return client;
  }

  async function teardownRealtime() {
    try {
      if (channel) await client.removeChannel(channel);
    } catch (e) {}
    channel = null;
  }

  async function ensureRealtime() {
    if (!client || !userId) return;
    if (channel) return;

    // Subscribe to row changes for this user.
    channel = client
      .channel('tp-sync-' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` },
        (payload) => {
          const remote = payload && payload.new ? payload.new.data : null;
          if (!remote) return;
          applyRemote(remote, 'realtime');
        }
      )
      .subscribe((status) => {
        // When realtime subscription is active, show it.
        if (status === 'SUBSCRIBED') setStatus('connected (realtime)');
      });
  }

  async function signInWithPassword() {
    const cfg = getCfg();
    if (!client) await initClient();
    if (!client) return;

    const emailEl = document.getElementById('sync-email');
    const passEl = document.getElementById('sync-password');
    const email = (emailEl && emailEl.value ? emailEl.value : cfg.email || '').trim();
    const password = (passEl && passEl.value ? passEl.value : '').trim();
    if (!email) { setStatus('enter email'); return; }
    if (!password) { setStatus('enter password'); return; }

    setStatus('signing in…');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('error: ' + (error.message || 'failed'));
    } else {
      userId = data && data.user ? data.user.id : userId;
      setStatus('connected');
      await ensureRealtime();
    }
  }

  async function signUpWithPassword() {
    const cfg = getCfg();
    if (!client) await initClient();
    if (!client) return;

    const emailEl = document.getElementById('sync-email');
    const passEl = document.getElementById('sync-password');
    const email = (emailEl && emailEl.value ? emailEl.value : cfg.email || '').trim();
    const password = (passEl && passEl.value ? passEl.value : '').trim();
    if (!email) { setStatus('enter email'); return; }
    if (!password) { setStatus('enter password'); return; }

    setStatus('creating account…');
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) {
      setStatus('error: ' + (error.message || 'failed'));
    } else {
      // Some projects require email confirmation; session may be null until confirmed.
      const uid = data && data.user ? data.user.id : null;
      if (uid) {
        userId = uid;
        setStatus('connected');
        await ensureRealtime();
      } else {
        setStatus('check your email to confirm');
      }
    }
  }

  async function logout() {
    if (!client) await initClient();
    if (!client) return;
    setStatus('signing out…');
    await teardownRealtime();
    const { error } = await client.auth.signOut();
    if (error) setStatus('error: ' + (error.message || 'failed'));
    else setStatus('signed out');
  }

  async function pullNow() {
    if (!client) await initClient();
    if (!client) return;
    if (!userId) { setStatus('sign in first'); return; }

    setStatus('pulling…');
    const { data, error } = await client.from(TABLE).select('data, updated_at').eq('user_id', userId).maybeSingle();
    if (error) { setStatus('error: ' + (error.message || 'pull failed')); return; }
    if (!data || !data.data) { setStatus('cloud empty (push first)'); return; }

    applyRemote(data.data, 'pull');
  }

  async function pushNow(stateOverride) {
    if (!client) await initClient();
    if (!client) return;
    if (!userId) { setStatus('sign in first'); return; }

    const local = stateOverride || localState();
    const payload = withMeta(local);

    setStatus('pushing…');
    const { error } = await client
      .from(TABLE)
      .upsert({ user_id: userId, data: payload, updated_at: nowIso() }, { onConflict: 'user_id' });

    if (error) { setStatus('error: ' + (error.message || 'push failed')); return; }
    lastPushedAt = Date.now();
    setStatus('connected (saved)');
  }

  function schedulePush(state) {
    const cfg = getCfg();
    if (!isConfigured(cfg)) { setStatus('not configured'); return; }
    // Only push if signed in & client exists; otherwise stay quiet.
    if (!client || !userId || applyingRemote) return;

    // Debounce writes (avoid spamming)
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushNow(state), 600);
  }

  function applyRemote(remoteState, source) {
    if (applyingRemote) return;
    applyingRemote = true;

    const remote = remoteState || {};
    const local = localState() || {};

    const rT = remote.__updatedAt ? Date.parse(remote.__updatedAt) : 0;
    const lT = local.__updatedAt ? Date.parse(local.__updatedAt) : 0;

    // Ignore our own fresh pushes
    if (Date.now() - lastPushedAt < 1500 && source === 'realtime') {
      applyingRemote = false;
      return;
    }

    // Only replace if remote is newer (or local has no meta)
    if (rT && (rT >= lT || !lT)) {
      localStorage.setItem(DATA_KEY, JSON.stringify(stripMeta(remote)));
      setStatus('updated from ' + source);
      // Reload to re-render everywhere without touching UI logic.
      setTimeout(() => location.reload(), 120);
    } else {
      setStatus('connected (up to date)');
    }

    applyingRemote = false;
  }

  function wireUI() {
    const urlEl = document.getElementById('sync-supabase-url');
    const keyEl = document.getElementById('sync-supabase-key');
    const emailEl = document.getElementById('sync-email');
    const passEl = document.getElementById('sync-password');
    const signInBtn = document.getElementById('sync-signin');
    const signUpBtn = document.getElementById('sync-signup');
    const logoutBtn = document.getElementById('sync-logout');
    const pullBtn = document.getElementById('sync-pull');
    const pushBtn = document.getElementById('sync-push');

    if (urlEl) urlEl.addEventListener('change', () => { localStorage.setItem(LS_URL, urlEl.value.trim()); initClient(); });
    if (keyEl) keyEl.addEventListener('change', () => { localStorage.setItem(LS_KEY, keyEl.value.trim()); initClient(); });
    if (emailEl) emailEl.addEventListener('change', () => { localStorage.setItem(LS_EMAIL, emailEl.value.trim()); });
    // Password is not persisted; only used for auth.
    function handleEnter(e){ if(e && e.key==='Enter') { e.preventDefault(); signInWithPassword(); } }
    if (passEl) passEl.addEventListener('keydown', handleEnter);
    if (emailEl) emailEl.addEventListener('keydown', handleEnter);

    if (signInBtn) signInBtn.addEventListener('click', (e) => { e.preventDefault(); signInWithPassword(); });
    if (signUpBtn) signUpBtn.addEventListener('click', (e) => { e.preventDefault(); signUpWithPassword(); });
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    if (pullBtn) pullBtn.addEventListener('click', (e) => { e.preventDefault(); pullNow(); });
    if (pushBtn) pushBtn.addEventListener('click', (e) => { e.preventDefault(); pushNow(); });

    // Fill stored values
    const cfg = getCfg();
    if (urlEl) urlEl.value = cfg.url || urlEl.value || '';
    if (keyEl) keyEl.value = cfg.key || keyEl.value || '';
    if (emailEl) emailEl.value = cfg.email || emailEl.value || '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireUI();
    initClient();
  });

  window.__tpSync = { initClient, schedulePush, pushNow, pullNow, signInWithPassword, signUpWithPassword, logout };
})();
