export function isObject(obj: unknown) {
  return typeof obj === "object" && !Array.isArray(obj) && obj !== null;
}

export function isArray(array: unknown) {
  return Array.isArray(array);
}

export function isBoolean(bool: unknown) {
  return typeof bool === "boolean";
}

export function isString(string: unknown) {
  return typeof string === "string";
}

export function isNumber(number: unknown) {
  return typeof number === "number";
}

export function isNull(_null: unknown) {
  return _null === null;
}

export const isValidJson = (payload: string) => {
  try {
    // eslint-disable-next-line
    JSON.stringify(eval(`(function () { return ${payload} })()`));

    return true;
  } catch (e) {
    return false;
  }
};
