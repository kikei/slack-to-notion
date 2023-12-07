export function truncate(text: string, length: number): string {
  return text.length > length
    ? text.slice(0, length - 3) + '...'
    : text;
}

export function headerLines(text: string, lines: number = 1): string {
  return text.split('\n').slice(0, lines).join('');
}

export function toText({header, trim}: {
  header?: number,
  trim?: 'left' | 'right' | 'both'
} = {}) {
  return (v: string) => {
    let t = v;
    if (header)
      t = headerLines(v, header);
    switch (trim) {
      case 'left':
        t = t.trimLeft();
        break;
      case 'right':
        t = t.trimRight();
        break;
      case 'both':
        t = t.trim();
        break;
    }
    return t;
  };
}

export function isText(text: string | undefined | null): text is string {
  return !!(text && text.length > 0);
}
