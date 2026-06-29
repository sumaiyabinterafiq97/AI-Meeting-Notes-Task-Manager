export interface VttCue {
  timestampStart?: string;
  timestampEnd?: string;
  speaker?: string;
  text: string;
}

const CUE_TIMESTAMP =
  /(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s*-->\s*(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/;
const SPEAKER_PREFIX = /^([A-Za-z0-9][\w\s.-]{0,40}):\s*(.+)$/;

/** Extract speaker and timestamp metadata from VTT/WebVTT transcript text. */
export function parseVttCues(content: string): VttCue[] {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/);
  const cues: VttCue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let timestampStart: string | undefined;
    let timestampEnd: string | undefined;

    const timestampLine = lines.find((line) => CUE_TIMESTAMP.test(line));
    if (timestampLine) {
      const match = timestampLine.match(CUE_TIMESTAMP);
      timestampStart = match?.[1];
      timestampEnd = match?.[2];
    }

    let textLines = lines.filter(
      (line) => !line.startsWith('WEBVTT') && !CUE_TIMESTAMP.test(line),
    );

    const body = textLines.join(' ').trim();
    if (!body) continue;

    const speakerMatch = body.match(SPEAKER_PREFIX);
    if (speakerMatch) {
      cues.push({
        timestampStart,
        timestampEnd,
        speaker: speakerMatch[1]?.trim(),
        text: speakerMatch[2]?.trim() ?? body,
      });
    } else {
      cues.push({ timestampStart, timestampEnd, text: body });
    }
  }

  return cues;
}

/** Strip VTT markup and return plain spoken text for chunking. */
export function stripVttToPlainText(content: string): string {
  const cues = parseVttCues(content);
  if (cues.length === 0) {
    return content.replace(/WEBVTT[^\n]*\n?/i, '').trim();
  }
  return cues.map((cue) => cue.text).join('\n\n');
}
