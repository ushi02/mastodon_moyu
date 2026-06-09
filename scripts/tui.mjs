import readline from 'node:readline';
import { stdin, stdout, exit } from 'node:process';

import { applyCustomEmojis, fetchTimeline, formatTime, stripHtml } from '../src/api/mastodon.ts';
import { DEFAULT_CONFIG } from '../src/api/types.ts';
import {
  getStatePath,
  loadTuiState,
  normalizeInstanceUrl,
  saveTuiState,
  updateTimelinePosition,
} from './tui-state.mjs';

const CSI = '\x1b[';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const REVERSE = '\x1b[7m';
const RESET = '\x1b[0m';

function visibleWidth(text) {
  let width = 0;
  for (const char of Array.from(text)) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) continue;
    if (
      code >= 0x1100 &&
      (
        code <= 0x115f ||
        code === 0x2329 ||
        code === 0x232a ||
        (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
        (code >= 0xac00 && code <= 0xd7a3) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe10 && code <= 0xfe19) ||
        (code >= 0xfe30 && code <= 0xfe6f) ||
        (code >= 0xff00 && code <= 0xff60) ||
        (code >= 0xffe0 && code <= 0xffe6)
      )
    ) {
      width += 2;
      continue;
    }
    width += 1;
  }
  return width;
}

function takeWidth(text, maxWidth) {
  let width = 0;
  let result = '';
  for (const char of Array.from(text)) {
    const nextWidth = visibleWidth(char);
    if (width + nextWidth > maxWidth) break;
    result += char;
    width += nextWidth;
  }
  return result;
}

function trimToWidth(text, maxWidth) {
  if (visibleWidth(text) <= maxWidth) return text;
  if (maxWidth <= 1) return takeWidth(text, maxWidth);
  return `${takeWidth(text, maxWidth - 1)}…`;
}

function wrapLine(line, width) {
  if (!line) return [''];

  const words = line.split(/(\s+)/).filter((part) => part.length > 0);
  const result = [];
  let current = '';

  for (const word of words) {
    if (visibleWidth(word) > width) {
      if (current.trim()) {
        result.push(current.trimEnd());
        current = '';
      }
      let rest = word;
      while (visibleWidth(rest) > width) {
        const chunk = takeWidth(rest, width);
        result.push(chunk.trimEnd());
        rest = rest.slice(chunk.length);
      }
      current = rest;
      continue;
    }

    const tentative = current + word;
    if (visibleWidth(tentative) > width && current.trim()) {
      result.push(current.trimEnd());
      current = word.trimStart();
    } else {
      current = tentative;
    }
  }

  if (current || result.length === 0) {
    result.push(current.trimEnd());
  }

  return result;
}

function wrapText(text, width) {
  return text
    .split('\n')
    .flatMap((line) => wrapLine(line, width))
    .map((line) => line || '');
}

function renderPlainText(html, emojis) {
  return stripHtml(applyCustomEmojis(html || '', emojis));
}

function summarizeStatus(status, isExpanded, width, isSelected) {
  const displayStatus = status.reblog ?? status;
  const lines = [];
  const contentWidth = Math.max(24, width - 2);
  const headerPrefix = isSelected ? `${REVERSE}>${RESET} ` : '  ';
  const displayName = renderPlainText(
    displayStatus.account.display_name || displayStatus.account.acct,
    displayStatus.account.emojis
  ) || displayStatus.account.acct;
  const boostedBy = status.reblog ? `boosted by @${status.account.acct}` : '';
  const meta = `@${displayStatus.account.acct} · ${formatTime(displayStatus.created_at)}`;

  lines.push(`${headerPrefix}${BOLD}${trimToWidth(displayName, contentWidth - 2)}${RESET}`);
  lines.push(`  ${DIM}${trimToWidth(meta, contentWidth)}${RESET}`);

  if (boostedBy) {
    lines.push(`  ${DIM}${trimToWidth(boostedBy, contentWidth)}${RESET}`);
  }

  if (displayStatus.spoiler_text) {
    const spoiler = renderPlainText(displayStatus.spoiler_text, displayStatus.emojis);
    const cwLabel = isExpanded ? '[CW open]' : '[CW hidden]';
    lines.push(`  ${trimToWidth(`${cwLabel} ${spoiler}`, contentWidth)}`);
  }

  if (!displayStatus.spoiler_text || isExpanded) {
    const body = renderPlainText(displayStatus.content, displayStatus.emojis) || '(no text)';
    for (const line of wrapText(body, contentWidth)) {
      lines.push(`  ${line}`);
    }
  }

  const stats = [];
  if (displayStatus.replies_count > 0) stats.push(`r ${displayStatus.replies_count}`);
  if (displayStatus.reblogs_count > 0) stats.push(`b ${displayStatus.reblogs_count}`);
  if (displayStatus.favourites_count > 0) stats.push(`f ${displayStatus.favourites_count}`);
  if (displayStatus.language) stats.push(displayStatus.language);
  if (stats.length > 0) {
    lines.push(`  ${DIM}${trimToWidth(stats.join('  '), contentWidth)}${RESET}`);
  }

  lines.push('');
  return lines;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

class MastodonTuiApp {
  constructor() {
    this.state = loadTuiState();
    this.config = { ...DEFAULT_CONFIG, ...this.state.config };
    this.timelineType = this.config.timelineType;
    this.timeline = [];
    this.cursorIndex = 0;
    this.topIndex = 0;
    this.expandedSpoilers = new Set(this.state.timelines[this.timelineType].expandedSpoilerIds);
    this.pendingG = false;
    this.pendingGTimer = null;
    this.statusMessage = '';
    this.errorMessage = '';
    this.loading = false;
    this.loadingMore = false;
    this.quitting = false;
    this.activeFetchId = 0;
  }

  async start() {
    if (process.argv.includes('--help')) {
      this.printHelp();
      return;
    }

    await this.ensureConfig();
    this.enterAltScreen();
    this.attachEvents();

    try {
      await this.refreshTimeline({ preserveAnchor: true });
      this.render();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error);
      this.render();
    }
  }

  printHelp() {
    stdout.write(
      [
        'TouchFish TUI',
        '',
        'npm run tui',
        '',
        'Keys:',
        '  j/k or arrows  move',
        '  d/u            half page',
        '  gg / G         top / bottom',
        '  r              refresh',
        '  c              toggle CW',
        '  h / p          home / public timeline',
        '  s              edit instance/token config',
        '  q              quit',
        '',
        `State file: ${getStatePath()}`,
        '',
      ].join('\n')
    );
  }

  async ensureConfig() {
    const needsSetup =
      !this.state.hasCompletedOnboarding ||
      !this.config.instanceUrl ||
      (this.config.timelineType === 'home' && !this.config.accessToken);

    if (!needsSetup) return;
    await this.promptForConfig(needsSetup ? '首次启动需要补全实例和时间线设置。' : '');
  }

  attachEvents() {
    readline.emitKeypressEvents(stdin);
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.on('keypress', this.handleKeypress);
    stdout.on('resize', this.handleResize);
    process.on('SIGINT', this.handleSigint);
  }

  detachEvents() {
    stdin.off('keypress', this.handleKeypress);
    stdout.off('resize', this.handleResize);
    process.off('SIGINT', this.handleSigint);
    if (stdin.isTTY) stdin.setRawMode(false);
    stdin.pause();
  }

  handleResize = () => {
    this.render();
  };

  handleSigint = () => {
    this.quit();
  };

  handleKeypress = async (_input, key = {}) => {
    if (this.loading && key.name !== 'q') {
      return;
    }

    if (key.ctrl && key.name === 'c') {
      this.quit();
      return;
    }

    if (this.pendingG && key.name !== 'g') {
      clearTimeout(this.pendingGTimer);
      this.pendingG = false;
      this.pendingGTimer = null;
    }

    if (key.shift && key.name === 'g') {
      this.cursorIndex = Math.max(this.timeline.length - 1, 0);
      this.ensureCursorVisible('bottom');
      await this.maybeLoadMore();
      this.persistPosition();
      this.render();
      return;
    }

    switch (key.name) {
      case 'down':
      case 'j':
        this.moveCursor(1);
        break;
      case 'up':
      case 'k':
        this.moveCursor(-1);
        break;
      case 'd':
        this.scrollHalfPage(1);
        break;
      case 'u':
        this.scrollHalfPage(-1);
        break;
      case 'g':
        if (this.pendingG) {
          clearTimeout(this.pendingGTimer);
          this.pendingG = false;
          this.pendingGTimer = null;
          this.cursorIndex = 0;
          this.topIndex = 0;
          this.persistPosition();
          this.render();
        } else {
          this.pendingG = true;
          this.pendingGTimer = setTimeout(() => {
            this.pendingG = false;
            this.pendingGTimer = null;
          }, 400);
          this.statusMessage = 'g';
          this.render();
        }
        break;
      case 'r':
        await this.refreshTimeline({ preserveAnchor: true });
        break;
      case 'c':
      case 'return':
        this.toggleSpoiler();
        break;
      case 'h':
        await this.switchTimeline('home');
        break;
      case 'p':
        await this.switchTimeline('public');
        break;
      case 's':
        await this.promptForConfig();
        await this.refreshTimeline({ preserveAnchor: true });
        break;
      case 'q':
      case 'escape':
        this.quit();
        return;
      default:
        return;
    }

    await this.maybeLoadMore();
    this.persistPosition();
    this.render();
  };

  enterAltScreen() {
    stdout.write(`${CSI}?1049h${CSI}?25l`);
  }

  leaveAltScreen() {
    stdout.write(`${CSI}?25h${CSI}?1049l`);
  }

  clearScreen() {
    stdout.write(`${CSI}2J${CSI}H`);
  }

  async promptForConfig(message = '') {
    const wasAttached = stdin.listenerCount('keypress') > 0;
    if (wasAttached) {
      this.detachEvents();
      this.leaveAltScreen();
    }

    const rl = readline.createInterface({ input: stdin, output: stdout });
    const ask = (question) =>
      new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));

    try {
      stdout.write('\nTouchFish TUI setup\n');
      if (message) stdout.write(`${message}\n`);

      const currentInstance = this.config.instanceUrl || DEFAULT_CONFIG.instanceUrl;
      const instanceInput = await ask(`Instance URL [${currentInstance}]: `);
      const normalizedInstanceUrl = normalizeInstanceUrl(instanceInput || currentInstance);

      const currentTimeline = this.config.timelineType || 'home';
      const timelineInput = (await ask(`Timeline (home/public) [${currentTimeline}]: `)).toLowerCase();
      const nextTimelineType = timelineInput === 'public' ? 'public' : 'home';

      const tokenHint =
        this.config.accessToken && nextTimelineType === 'home'
          ? 'leave blank to keep current token'
          : 'optional for public timeline';
      const tokenInput = await ask(`Access Token (${tokenHint}): `);
      const accessToken =
        tokenInput || (nextTimelineType === 'home' ? this.config.accessToken : this.config.accessToken || '');

      this.config = {
        ...this.config,
        instanceUrl: normalizedInstanceUrl,
        timelineType: nextTimelineType,
        accessToken,
      };

      this.state = {
        ...this.state,
        hasCompletedOnboarding: true,
        config: {
          ...this.state.config,
          instanceUrl: this.config.instanceUrl,
          timelineType: this.config.timelineType,
          accessToken: this.config.accessToken,
        },
      };
      saveTuiState(this.state);
      this.timelineType = this.config.timelineType;
      this.expandedSpoilers = new Set(this.state.timelines[this.timelineType].expandedSpoilerIds);
      this.statusMessage = `using ${this.timelineType}`;
      this.errorMessage = '';
    } finally {
      rl.close();
      if (wasAttached) {
        this.enterAltScreen();
        this.attachEvents();
      }
    }
  }

  async switchTimeline(nextTimelineType) {
    if (this.timelineType === nextTimelineType) return;

    this.persistPosition();
    this.timelineType = nextTimelineType;
    this.config = { ...this.config, timelineType: nextTimelineType };
    this.state = {
      ...this.state,
      config: {
        ...this.state.config,
        timelineType: nextTimelineType,
      },
    };
    this.expandedSpoilers = new Set(this.state.timelines[nextTimelineType].expandedSpoilerIds);
    await this.refreshTimeline({ preserveAnchor: true });
  }

  async refreshTimeline({ preserveAnchor }) {
    this.loading = true;
    this.errorMessage = '';
    this.statusMessage = 'refreshing';
    this.render();

    const fetchId = ++this.activeFetchId;
    try {
      const data = await fetchTimeline(this.config);
      if (fetchId !== this.activeFetchId) return;
      this.timeline = data;
      this.restorePosition(preserveAnchor);
      this.statusMessage = `${this.timelineType} · ${data.length} posts`;
      this.persistPosition();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error);
      this.statusMessage = 'refresh failed';
      if (
        this.timelineType === 'home' &&
        /auth|token|authenticated|401/i.test(this.errorMessage)
      ) {
        this.statusMessage = 'home auth failed, press s to update token';
      }
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async maybeLoadMore() {
    if (this.loadingMore || this.loading || this.timeline.length === 0) return;
    if (this.cursorIndex < this.timeline.length - 3) return;

    const lastStatus = this.timeline.at(-1);
    if (!lastStatus) return;

    this.loadingMore = true;
    this.statusMessage = 'loading more';
    this.render();

    try {
      const more = await fetchTimeline(this.config, { maxId: lastStatus.id });
      if (more.length > 0) {
        const knownIds = new Set(this.timeline.map((status) => status.id));
        for (const status of more) {
          if (!knownIds.has(status.id)) {
            this.timeline.push(status);
          }
        }
      }
      this.statusMessage = `${this.timelineType} · ${this.timeline.length} posts`;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error);
      this.statusMessage = 'load more failed';
    } finally {
      this.loadingMore = false;
    }
  }

  restorePosition(preserveAnchor) {
    const timelineState = this.state.timelines[this.timelineType];
    const selectedIndex = preserveAnchor && timelineState.selectedStatusId
      ? this.timeline.findIndex((status) => status.id === timelineState.selectedStatusId)
      : -1;
    const topIndex = preserveAnchor && timelineState.topStatusId
      ? this.timeline.findIndex((status) => status.id === timelineState.topStatusId)
      : -1;

    this.cursorIndex = selectedIndex >= 0 ? selectedIndex : 0;
    this.topIndex = topIndex >= 0 ? topIndex : this.cursorIndex;
    this.ensureCursorVisible('nearest');
  }

  moveCursor(delta) {
    if (this.timeline.length === 0) return;
    this.cursorIndex = clamp(this.cursorIndex + delta, 0, this.timeline.length - 1);
    this.ensureCursorVisible(delta > 0 ? 'bottom' : 'top');
    this.statusMessage = `${this.cursorIndex + 1}/${this.timeline.length}`;
  }

  scrollHalfPage(direction) {
    if (this.timeline.length === 0) return;
    const step = Math.max(Math.floor(this.bodyHeight() / 3), 3);
    const target = this.cursorIndex + step * direction;
    this.cursorIndex = clamp(target, 0, this.timeline.length - 1);
    this.ensureCursorVisible(direction > 0 ? 'bottom' : 'top');
    this.statusMessage = `${this.cursorIndex + 1}/${this.timeline.length}`;
  }

  toggleSpoiler() {
    const current = this.timeline[this.cursorIndex];
    const displayStatus = current?.reblog ?? current;
    if (!displayStatus?.spoiler_text) return;

    if (this.expandedSpoilers.has(displayStatus.id)) {
      this.expandedSpoilers.delete(displayStatus.id);
    } else {
      this.expandedSpoilers.add(displayStatus.id);
    }

    this.persistPosition();
    this.render();
  }

  bodyHeight() {
    return Math.max((stdout.rows || 24) - 2, 6);
  }

  ensureCursorVisible(prefer) {
    if (this.timeline.length === 0) {
      this.cursorIndex = 0;
      this.topIndex = 0;
      return;
    }

    this.cursorIndex = clamp(this.cursorIndex, 0, this.timeline.length - 1);
    this.topIndex = clamp(this.topIndex, 0, this.timeline.length - 1);

    const viewport = this.computeViewport(this.topIndex);
    const isVisible = viewport.indices.includes(this.cursorIndex);
    if (isVisible) return;

    if (prefer === 'top') {
      this.topIndex = this.cursorIndex;
      return;
    }

    if (prefer === 'bottom') {
      let candidate = this.cursorIndex;
      while (candidate > 0) {
        const view = this.computeViewport(candidate);
        if (view.indices.includes(this.cursorIndex)) {
          this.topIndex = candidate;
          return;
        }
        candidate -= 1;
      }
    }

    this.topIndex = this.cursorIndex;
  }

  computeViewport(startIndex) {
    const width = Math.max((stdout.columns || 80) - 1, 30);
    const height = this.bodyHeight();
    const lines = [];
    const indices = [];

    for (let index = startIndex; index < this.timeline.length; index += 1) {
      const status = this.timeline[index];
      const displayStatus = status.reblog ?? status;
      const isExpanded = this.expandedSpoilers.has(displayStatus.id);
      const itemLines = summarizeStatus(status, isExpanded, width, index === this.cursorIndex);

      if (lines.length > 0 && lines.length + itemLines.length > height) {
        break;
      }

      indices.push(index);
      lines.push(...itemLines);

      if (lines.length >= height) {
        break;
      }
    }

    return { lines: lines.slice(0, height), indices };
  }

  persistPosition() {
    const selectedStatus = this.timeline[this.cursorIndex];
    const topStatus = this.timeline[this.topIndex];
    this.state = updateTimelinePosition(this.state, this.timelineType, {
      selectedStatusId: selectedStatus?.id ?? null,
      topStatusId: topStatus?.id ?? null,
      expandedSpoilerIds: Array.from(this.expandedSpoilers),
    });
    this.state = {
      ...this.state,
      config: {
        ...this.state.config,
        instanceUrl: this.config.instanceUrl,
        accessToken: this.config.accessToken,
        timelineType: this.timelineType,
      },
    };
    saveTuiState(this.state);
  }

  render() {
    if (this.quitting) return;

    const width = Math.max(stdout.columns || 80, 40);
    const { lines } = this.computeViewport(this.topIndex);
    const header = trimToWidth(
      `touchfish ${this.timelineType}  j/k move  d/u page  gg/G jump  c cw  r refresh  s setup  q quit`,
      width
    );

    const footerSource = this.errorMessage || this.statusMessage || `${this.timeline.length} posts`;
    const footer = trimToWidth(footerSource, width);

    this.clearScreen();
    stdout.write(`${DIM}${header}${RESET}\n`);

    if (this.timeline.length === 0 && !this.loading && !this.errorMessage) {
      stdout.write('  no posts yet\n');
    } else {
      stdout.write(lines.join('\n'));
      if (lines.length > 0 && !lines.at(-1)?.endsWith('\n')) {
        stdout.write('\n');
      }
    }

    const fillerLines = Math.max(this.bodyHeight() - lines.length - (this.timeline.length === 0 ? 1 : 0), 0);
    for (let index = 0; index < fillerLines; index += 1) {
      stdout.write('\n');
    }

    stdout.write(`${DIM}${footer}${RESET}`);
  }

  quit() {
    if (this.quitting) return;
    this.quitting = true;
    this.persistPosition();
    this.detachEvents();
    this.leaveAltScreen();
    stdout.write('\n');
    exit(0);
  }
}

const app = new MastodonTuiApp();
app.start().catch((error) => {
  stdout.write(`\n${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  exit(1);
});
