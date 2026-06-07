export function makeClassName(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
