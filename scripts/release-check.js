import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ScriptDirectory = dirname(fileURLToPath(import.meta.url));
const RepositoryRoot = join(ScriptDirectory, '..');
const PublicGameUrl = 'https://southers.github.io/WORLDSEED/';
const ExpectedThreeRuntimeSha256 = '06552c54e4071fbc7305117aafe6765d92c5d2a2a83507d4f05b9bf4f3d4d463';
const ExpectedThreeCoreSha256 = '79f2b4f58d3e99a9948a4d3b7f6d5c2daf705bdefe9fb82ebec715623966551c';
const RequiredTextFiles = [
  'AGENTS.md',
  'CREDITS.md',
  'DESIGN.md',
  'JAM_PLAN.md',
  'README.md',
  'SUBMISSION.md',
  'index.html',
  'src/audio.js',
  'src/campaign.js',
  'src/content.js',
  'src/main.js',
  'src/physics.js',
  'src/restoration.js',
  'src/style.css',
  'vendor/THREE-LICENSE.txt',
];
const RequiredSubmissionImages = [
  'submission/opening.png',
  'submission/thumbnail.png',
  'submission/victory.png',
];
const RequiredSubmissionVideos = [
  'submission/worldseed-showcase.mp4',
];

function repositoryPath(RelativePath) {
  return join(RepositoryRoot, ...RelativePath.split('/'));
}

async function readRequiredFile(RelativePath) {
  try {
    return await readFile(repositoryPath(RelativePath));
  } catch (ErrorObject) {
    throw new Error(`Missing required release file: ${RelativePath}`, { cause: ErrorObject });
  }
}

function readPngDimensions(PngBuffer, Label) {
  const ExpectedSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(PngBuffer.subarray(0, 8).equals(ExpectedSignature), `${Label} must be a PNG`);
  assert.equal(PngBuffer.subarray(12, 16).toString('ascii'), 'IHDR', `${Label} needs IHDR`);
  return {
    width: PngBuffer.readUInt32BE(16),
    height: PngBuffer.readUInt32BE(20),
  };
}

function verifyMp4(Mp4Buffer, Label) {
  assert.ok(Mp4Buffer.length >= 100_000, `${Label} must contain a useful showcase clip`);
  assert.ok(Mp4Buffer.length <= 20_000_000, `${Label} must remain submission-friendly`);
  assert.equal(Mp4Buffer.subarray(4, 8).toString('ascii'), 'ftyp', `${Label} must be an MP4`);
  assert.ok(Mp4Buffer.includes(Buffer.from('avc1')), `${Label} must contain H.264 video`);
}

function requireText(Text, ExpectedText, Label) {
  assert.ok(Text.includes(ExpectedText), `${Label} must include ${JSON.stringify(ExpectedText)}`);
}

function requirePattern(Text, Pattern, Label) {
  assert.match(Text, Pattern, `${Label} must match ${Pattern}`);
}

async function verifyLocalRelease() {
  const TextByPath = new Map();
  for (const RelativePath of RequiredTextFiles) {
    TextByPath.set(RelativePath, (await readRequiredFile(RelativePath)).toString('utf8'));
  }

  for (const RelativePath of RequiredSubmissionImages) {
    const ImageBuffer = await readRequiredFile(RelativePath);
    const ImageDimensions = readPngDimensions(ImageBuffer, RelativePath);
    assert.deepEqual(
      ImageDimensions,
      { width: 1200, height: 600 },
      `${RelativePath} must be exactly 1200×600`,
    );
  }

  for (const RelativePath of RequiredSubmissionVideos) {
    verifyMp4(await readRequiredFile(RelativePath), RelativePath);
  }

  const IndexHtml = TextByPath.get('index.html');
  requireText(IndexHtml, '<title>WORLDSEED</title>', 'index.html');
  requireText(IndexHtml, 'submission/thumbnail.png', 'index.html');
  requirePattern(
    IndexHtml,
    /submission\/thumbnail\.png\?v=[^"']+/,
    'versioned social thumbnail',
  );
  requireText(IndexHtml, 'twitter:card', 'index.html');
  requirePattern(IndexHtml, /src\/style\.css\?v=[^"']+/, 'index.html stylesheet');
  requirePattern(IndexHtml, /src\/main\.js\?v=[^"']+/, 'index.html module');
  requireText(IndexHtml, '"three": "./vendor/three.module.min.js?v=0.179.1"', 'index.html import map');
  requireText(IndexHtml, 'aria-describedby="InstructionPanel"', 'canvas instructions');
  requireText(IndexHtml, 'aria-live="polite" aria-atomic="true"', 'route announcement');
  requireText(IndexHtml, 'aria-modal="true"', 'completion dialog');
  requireText(IndexHtml, 'aria-keyshortcuts="M"', 'audio keyboard shortcut');
  requireText(IndexHtml, 'aria-keyshortcuts="R"', 'reset keyboard shortcut');
  assert.ok(!IndexHtml.includes('cdn.jsdelivr.net'), 'index.html must not require jsDelivr');

  const StyleCss = TextByPath.get('src/style.css');
  requireText(StyleCss, ':focus-visible', 'visible keyboard focus');
  requireText(StyleCss, '@media (prefers-reduced-motion: reduce)', 'reduced-motion styling');

  const ThreeRuntimeBuffer = await readRequiredFile('vendor/three.module.min.js');
  const ThreeRuntimeSha256 = createHash('sha256').update(ThreeRuntimeBuffer).digest('hex');
  assert.equal(
    ThreeRuntimeSha256,
    ExpectedThreeRuntimeSha256,
    'Vendored Three.js runtime must match the pinned 0.179.1 module',
  );
  requireText(
    ThreeRuntimeBuffer.toString('utf8'),
    './three.core.min.js',
    'vendored Three.js module dependency',
  );
  const ThreeCoreBuffer = await readRequiredFile('vendor/three.core.min.js');
  assert.equal(
    createHash('sha256').update(ThreeCoreBuffer).digest('hex'),
    ExpectedThreeCoreSha256,
    'Vendored Three.js core must match pinned 0.179.1',
  );
  requireText(
    TextByPath.get('vendor/THREE-LICENSE.txt'),
    'The MIT License',
    'vendored Three.js license',
  );

  const MainJavaScript = TextByPath.get('src/main.js');
  requirePattern(MainJavaScript, /\.\/audio\.js\?v=[^"']+/, 'main audio import');
  requirePattern(MainJavaScript, /\.\/campaign\.js\?v=[^"']+/, 'main campaign import');
  requirePattern(MainJavaScript, /\.\/content\.js\?v=[^"']+/, 'main content import');
  requirePattern(MainJavaScript, /\.\/physics\.js\?v=[^"']+/, 'main physics import');
  requirePattern(MainJavaScript, /\.\/restoration\.js\?v=[^"']+/, 'main restoration import');
  requireText(MainJavaScript, "dataset.build = '", 'main build marker');
  requireText(MainJavaScript, 'getAuthoredSystemDefinition', 'main authored-system selection');
  requireText(MainJavaScript, 'getNextAuthoredSystemIdentifier', 'main campaign progression');
  requireText(MainJavaScript, 'continueCampaignOrReplay', 'main Worldheart campaign handoff');
  requireText(MainJavaScript, 'dataset.system = ActiveSystem.id', 'main active-system marker');
  requireText(MainJavaScript, 'ReducedMotionMediaQuery', 'reduced-motion runtime');
  requireText(MainJavaScript, 'dataset.pageActive', 'page lifecycle marker');
  requireText(MainJavaScript, 'dataset.webglAvailable', 'WebGL lifecycle marker');
  requireText(MainJavaScript, 'ShouldRestoreCanvasFocus', 'completion focus restoration');

  const ContentJavaScript = TextByPath.get('src/content.js');
  requireText(ContentJavaScript, 'AuthoredSystemDefinitions', 'authored-system registry');
  requireText(ContentJavaScript, 'AuthoredCampaignSystemIdentifiers', 'authored campaign order');
  requireText(ContentJavaScript, "id: 'broken-belt'", 'Broken Belt authored content');
  requireText(ContentJavaScript, 'completion:', 'authored completion presentation');
  requireText(ContentJavaScript, 'constellation:', 'authored constellation presentation');

  const SubmissionMarkdown = TextByPath.get('SUBMISSION.md');
  requireText(SubmissionMarkdown, PublicGameUrl, 'SUBMISSION.md');
  requireText(SubmissionMarkdown, 'https://github.com/Southers/WORLDSEED', 'SUBMISSION.md');
  requireText(SubmissionMarkdown, 'Theme: Tiny Worlds', 'SUBMISSION.md');
  requireText(SubmissionMarkdown, 'submission/worldseed-showcase.mp4', 'SUBMISSION.md');
  requireText(
    SubmissionMarkdown,
    'https://x.com/dangreenheck/status/2087399084940239337',
    'verified jam entry destination',
  );
  requireText(
    SubmissionMarkdown,
    'Wednesday, 19 August 2026 at 00:00 UTC',
    'verified jam deadline',
  );
  requireText(SubmissionMarkdown, 'Prepared reply', 'prepared jam reply');
  requireText(SubmissionMarkdown, 'Final release evidence', 'final release evidence');
  requireText(
    SubmissionMarkdown,
    'Manual check still required at handoff:',
    'honest backgrounding handoff',
  );
  requireText(SubmissionMarkdown, 'FINAL APPROVAL REQUIRED:', 'SUBMISSION.md');
  requireText(
    SubmissionMarkdown,
    "Obtain the user's explicit confirmation at the final Reply or Post step.",
    'SUBMISSION.md',
  );
  requireText(SubmissionMarkdown, 'Published submission URL: _pending_', 'SUBMISSION.md');

  const CreditsMarkdown = TextByPath.get('CREDITS.md');
  requireText(CreditsMarkdown, 'Three.js', 'CREDITS.md');
  requireText(CreditsMarkdown, 'MIT License', 'CREDITS.md');
  requireText(CreditsMarkdown, 'no sampled or third-party source material', 'CREDITS.md');

  return {
    images: RequiredSubmissionImages.length,
    textFiles: RequiredTextFiles.length,
    videos: RequiredSubmissionVideos.length,
  };
}

async function verifyOnlineRelease() {
  const CacheBuster = `release-check=${Date.now()}`;
  const PageResponse = await fetch(`${PublicGameUrl}?${CacheBuster}`, { cache: 'no-store' });
  assert.ok(PageResponse.ok, `Public game returned HTTP ${PageResponse.status}`);
  const PublicHtml = await PageResponse.text();
  requireText(PublicHtml, '<title>WORLDSEED</title>', 'public index');
  requireText(PublicHtml, 'submission/thumbnail.png', 'public index');

  const ModuleMatch = PublicHtml.match(/src="(\.\/src\/main\.js\?v=[^"]+)"/);
  assert.ok(ModuleMatch, 'Public index must reference a versioned main module');
  const ModuleUrl = new URL(ModuleMatch[1], PublicGameUrl);
  const ModuleResponse = await fetch(ModuleUrl, { cache: 'no-store' });
  assert.ok(ModuleResponse.ok, `Public main module returned HTTP ${ModuleResponse.status}`);
  const PublicMainJavaScript = await ModuleResponse.text();
  requireText(PublicMainJavaScript, "dataset.build = '", 'public main module');

  const ContentMatch = PublicMainJavaScript.match(/from '\.\/content\.js\?v=([^']+)'/);
  assert.ok(ContentMatch, 'Public main module must reference versioned authored content');
  const ContentUrl = new URL(`./src/content.js?v=${ContentMatch[1]}`, PublicGameUrl);
  const ContentResponse = await fetch(ContentUrl, { cache: 'no-store' });
  assert.ok(ContentResponse.ok, `Public authored content returned HTTP ${ContentResponse.status}`);
  const PublicContentJavaScript = await ContentResponse.text();
  requireText(PublicContentJavaScript, "id: 'first-light'", 'public authored content');
  requireText(PublicContentJavaScript, "id: 'broken-belt'", 'public Broken Belt content');

  const RuntimeMatch = PublicHtml.match(/"three"\s*:\s*"([^"]+)"/);
  assert.ok(RuntimeMatch, 'Public index must reference the vendored Three.js runtime');
  const RuntimeUrl = new URL(RuntimeMatch[1], PublicGameUrl);
  const RuntimeResponse = await fetch(RuntimeUrl, { cache: 'no-store' });
  assert.ok(RuntimeResponse.ok, `Public Three.js runtime returned HTTP ${RuntimeResponse.status}`);
  const RuntimeBuffer = Buffer.from(await RuntimeResponse.arrayBuffer());
  assert.equal(
    createHash('sha256').update(RuntimeBuffer).digest('hex'),
    ExpectedThreeRuntimeSha256,
    'Public Three.js runtime must match pinned 0.179.1',
  );
  const CoreUrl = new URL('./three.core.min.js', RuntimeUrl);
  const CoreResponse = await fetch(CoreUrl, { cache: 'no-store' });
  assert.ok(CoreResponse.ok, `Public Three.js core returned HTTP ${CoreResponse.status}`);
  const CoreBuffer = Buffer.from(await CoreResponse.arrayBuffer());
  assert.equal(
    createHash('sha256').update(CoreBuffer).digest('hex'),
    ExpectedThreeCoreSha256,
    'Public Three.js core must match pinned 0.179.1',
  );

  const ThumbnailMatch = PublicHtml.match(/property="og:image" content="([^"]+)"/);
  assert.ok(ThumbnailMatch, 'Public index must expose an Open Graph thumbnail');
  const ThumbnailUrl = new URL(ThumbnailMatch[1], PublicGameUrl);
  ThumbnailUrl.searchParams.set('release-check', String(Date.now()));
  const ThumbnailResponse = await fetch(ThumbnailUrl, { cache: 'no-store' });
  assert.ok(ThumbnailResponse.ok, `Public thumbnail returned HTTP ${ThumbnailResponse.status}`);
  const ThumbnailContentType = ThumbnailResponse.headers.get('content-type') ?? '';
  assert.match(ThumbnailContentType, /^image\/png\b/i, 'Public thumbnail must use image/png');
  const ThumbnailBuffer = Buffer.from(await ThumbnailResponse.arrayBuffer());
  assert.deepEqual(
    readPngDimensions(ThumbnailBuffer, 'public thumbnail'),
    { width: 1200, height: 600 },
    'Public thumbnail must be exactly 1200×600',
  );

  const ShowcaseUrl = new URL('submission/worldseed-showcase.mp4', PublicGameUrl);
  ShowcaseUrl.searchParams.set('release-check', String(Date.now()));
  const ShowcaseResponse = await fetch(ShowcaseUrl, { cache: 'no-store' });
  assert.ok(ShowcaseResponse.ok, `Public showcase returned HTTP ${ShowcaseResponse.status}`);
  const ShowcaseContentType = ShowcaseResponse.headers.get('content-type') ?? '';
  assert.match(ShowcaseContentType, /^video\/mp4\b/i, 'Public showcase must use video/mp4');
  verifyMp4(Buffer.from(await ShowcaseResponse.arrayBuffer()), 'public showcase');

  return {
    buildMarker: PublicMainJavaScript.match(/dataset\.build = '([^']+)'/)?.[1] ?? 'unknown',
    contentStatus: ContentResponse.status,
    coreStatus: CoreResponse.status,
    pageStatus: PageResponse.status,
    runtimeStatus: RuntimeResponse.status,
    showcaseContentType: ShowcaseContentType,
    showcaseStatus: ShowcaseResponse.status,
    thumbnailContentType: ThumbnailContentType,
    thumbnailStatus: ThumbnailResponse.status,
  };
}

const IsOnlineCheckRequested = process.argv.includes('--online');
const LocalEvidence = await verifyLocalRelease();
const OnlineEvidence = IsOnlineCheckRequested ? await verifyOnlineRelease() : null;

console.log('WORLDSEED release audit passed.');
console.log(
  `Local package: ${LocalEvidence.textFiles} required files, ${LocalEvidence.images} screenshots, ${LocalEvidence.videos} showcase video.`,
);
if (OnlineEvidence) {
  console.log(
    `Public build: HTTP ${OnlineEvidence.pageStatus}, content/runtime/core HTTP ${OnlineEvidence.contentStatus}/${OnlineEvidence.runtimeStatus}/${OnlineEvidence.coreStatus}, thumbnail HTTP ${OnlineEvidence.thumbnailStatus} ${OnlineEvidence.thumbnailContentType}, showcase HTTP ${OnlineEvidence.showcaseStatus} ${OnlineEvidence.showcaseContentType}, marker ${OnlineEvidence.buildMarker}.`,
  );
}
