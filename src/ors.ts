type OrCondition<T> = () => T | undefined;

export function ors<T>(conditions: Array<OrCondition<T>>): T {
  for (const cond of conditions) {
    const result = cond();
    if (result) return result;
  }
  throw new Error('No value found.');
}

export function orCase<I, O>({input, pred, output}: {
  input: I,
  pred?: (input: I) => boolean,
  output: (input: I) => O
}): OrCondition<O> {
  return () => pred
    ? pred(input)
    ? output(input)
    : undefined
    : output(input);
}

export function orDefault<O>(output: O): OrCondition<O> {
  return () => output;
}
