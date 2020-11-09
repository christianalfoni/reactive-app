export default function mapValues<
  Obj extends Record<string, unknown>,
  Res extends { [key in keyof Obj]: any }
>(o: Obj, func: (value: Obj[keyof Obj]) => Res[keyof Obj]) {
  const res: any = {};
  for (const key in o) {
    // eslint-disable-next-line no-prototype-builtins
    if (o.hasOwnProperty(key)) {
      res[key] = func(o[key]);
    }
  }
  return res as Res;
}
