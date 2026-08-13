import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ScriptDirectory = dirname(fileURLToPath(import.meta.url));
const RepositoryRoot = join(ScriptDirectory, '..');
const PublicGameUrl = 'https://southers.github.io/WORLDSEED/';
const RequiredTextFiles = [
  'AGENTS.md',
  'CREDITS.md',
  'DESIGN.md',
  'JAM_PLAN.md',
  'README.md',
  'SUBMISSION.md',
  'index.html',
  'src/audio.js',
  'src/main.js',
  'src/physics.js',
  'src/restoration.js',
  'src/style.css',
];
const RequiredSubmissionImages = [
  'submission/opening.png',
  'submission/thumbnail.png',
  'submission/victory.png',
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

  const IndexHtml = TextByPath.get('index.html');
  requireText(IndexHtml, '<title>WORLDSEED</title>', 'index.html');
  requireText(IndexHtml, 'submission/thumbnail.png', 'index.html');
  requireText(IndexHtml, 'twitter:card', 'index.html');
  requirePattern(IndexHtml, /src\/style\.css\?v=[^"']+/, 'index.html stylesheet');
  requirePattern(IndexHtml, /src\/main\.js\?v=[^"']+/, 'index.html module');

  const MainJavaScript = TextByPath.get('src/main.js');
  requirePattern(MainJavaScript, /\.\/audio\.js\?v=[^"']+/, 'main audio import');
  requirePattern(MainJavaScript, /\.\/physics\.js\?v=[^"']+/, 'main physics import');
  requirePattern(MainJavaScript, /\.\/restoration\.js\?v=[^"']+/, 'main restoration import');
  requireText(MainJavaScript, "dataset.build = '", 'main build marker');

  const SubmissionMarkdown = TextByPath.get('SUBMISSION.md');
  requireText(SubmissionMarkdown, PublicGameUrl, 'SUBMISSION.md');
  requireText(SubmissionMarkdown, 'https://github.com/Southers/WORLDSEED', 'SUBMISSION.md');
  requireText(SubmissionMarkdown, 'Theme: Tiny Worlds', 'SUBMISSION.md');
  requireText(SubmissionMarkdown, 'Published submission URL: _pending_', 'SUBMISSION.md');

  const CreditsMarkdown = TextByPath.get('CREDITS.md');
  requireText(CreditsMarkdown, 'Three.js', 'CREDITS.md');
  requireText(CreditsMarkdown, 'MIT License', 'CREDITS.md');
  requireText(CreditsMarkdown, 'no sampled or third-party source material', 'CREDITS.md');

  return {
    images: RequiredSubmissionImages.length,
    textFiles: RequiredTextFiles.length,
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

  const ThumbnailUrl = new URL('submission/thumbnail.png', PublicGameUrl);
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

  return {
    buildMarker: PublicMainJavaScript.match(/dataset\.build = '([^']+)'/)?.[1] ?? 'unknown',
    pageStatus: PageResponse.status,
    thumbnailContentType: ThumbnailContentType,
    thumbnailStatus: ThumbnailResponse.status,
  };
}

const IsOnlineCheckRequested = process.argv.includes('--online');
const LocalEvidence = await verifyLocalRelease();
const OnlineEvidence = IsOnlineCheckRequested ? await verifyOnlineRelease() : null;

console.log('WORLDSEED release audit passed.');
console.log(`Local package: ${LocalEvidence.textFiles} required files, ${LocalEvidence.images} screenshots.`);
if (OnlineEvidence) {
  console.log(
    `Public build: HTTP ${OnlineEvidence.pageStatus}, thumbnail HTTP ${OnlineEvidence.thumbnailStatus} ${OnlineEvidence.thumbnailContentType}, marker ${OnlineEvidence.buildMarker}.`,
  );
}
