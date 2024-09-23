export function all<T>(items: Iterable<T>, predicate?: (item: T) => boolean): boolean {
  for (const item of items) {
    if (predicate != null && !predicate(item)) {
      return false;
    }
  }
  return true;
}

export function any<T>(items: Iterable<T>, predicate?: (item: T) => boolean): boolean {
  for (const item of items) {
    if (predicate == null || predicate(item)) {
      return true;
    }
  }
  return false;
}

export function* concat<T>(items1: Iterable<T>, items2: Iterable<T>): IterableIterator<T> {
  yield* items1;
  yield* items2;
}

export function* map<T1, T2>(items: Iterable<T1>, selector: (item: T1) => T2): IterableIterator<T2> {
  for (const item of items) {
    yield selector(item);
  }
}

export function first<T>(items: Iterable<T>, selector?: (item: T) => boolean): T {
  const item: T | undefined = firstOrUndefined(items, selector);
  if (item != null) {
    return item;
  }
  throw new Error('The collection does not contain any items.');
}

export function firstOrUndefined<T>(items: Iterable<T>, selector?: (item: T) => boolean): T | undefined {
  for (const item of items) {
    if (selector != null) {
      if (selector(item)) {
        return item;
      }
    } else {
      return item;
    }
  }
}

export function last<T>(items: Iterable<T>, selector?: (item: T) => boolean): T {
  const item: T | undefined = lastOrUndefined(items, selector);
  if (item != null) {
    return item;
  }
  throw new Error('The collection does not contain any items.');
}

export function lastOrUndefined<T>(items: Iterable<T>, selector?: (item: T) => boolean): T | undefined {
  if (Array.isArray(items)) {
    const array = items as T[];
    for (let i = array.length - 1; i >= 0; i--) {
      const item = array[i];
      if (selector != null) {
        if (selector(item)) {
          return item;
        }
      } else {
        return item;
      }
    }
  } else {
    let lastItem: T | undefined = undefined;
    for (const item of items) {
      if (selector != null) {
        if (selector(item)) {
          lastItem = item;
        }
      } else {
        lastItem = item;
      }
    }

    if (lastItem != null) {
      return lastItem;
    }
  }
}

export function* take<T>(items: Iterable<T>, n: number): IterableIterator<T> {
  if (n > 0) {
    let count = 0;
    for (const item of items) {
      yield item;
      count++;
      if (count === n) {
        break;
      }
    }
  }
}
