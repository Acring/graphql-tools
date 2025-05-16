import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import { getRootTypeNames } from '@graphql-tools/utils';
import { KeyTypeConstraints, Ref } from './types.js';

export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line eqeqeq
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const randomListLength = () => {
  // Mocking has always returned list of length 2 by default
  // return 1 + Math.round(Math.random() * 10)
  return 2;
};

export const takeRandom = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function makeRef<KeyT extends KeyTypeConstraints = string>(
  typeName: string,
  key: KeyT,
): Ref<KeyT> {
  return { $ref: { key, typeName } };
}

export function isObject(thing: any) {
  return thing === Object(thing) && !Array.isArray(thing);
}

export function copyOwnPropsIfNotPresent(target: Record<string, any>, source: Record<string, any>) {
  for (const prop of Object.getOwnPropertyNames(source)) {
    if (!Object.getOwnPropertyDescriptor(target, prop)) {
      const propertyDescriptor = Object.getOwnPropertyDescriptor(source, prop);
      Object.defineProperty(target, prop, propertyDescriptor == null ? {} : propertyDescriptor);
    }
  }
}

export function copyOwnProps(target: Record<string, any>, ...sources: Array<Record<string, any>>) {
  for (const source of sources) {
    let chain = source;
    while (chain != null) {
      copyOwnPropsIfNotPresent(target, chain);
      chain = Object.getPrototypeOf(chain);
    }
  }
  return target;
}

export const isRootType = (type: GraphQLObjectType, schema: GraphQLSchema) => {
  const rootTypeNames = getRootTypeNames(schema);

  return rootTypeNames.has(type.name);
};

/**
 * 获取对象的嵌套属性值，如果路径不存在返回默认值
 * 类似于 lodash.get
 */
export function get(obj: any, path: string | string[], defaultValue?: any): any {
  // 如果对象为空，直接返回默认值
  if (obj == null) return defaultValue;

  // 将路径字符串转换为数组
  const keys = Array.isArray(path) ? path : path.split('.');

  // 初始化当前值为对象本身
  let result = obj;

  // 遍历路径数组
  for (let i = 0; i < keys.length; i++) {
    // 如果当前值为 null 或 undefined，返回默认值
    if (result == null) return defaultValue;

    // 获取下一层级的值
    result = result[keys[i]];
  }

  // 如果最终结果为 undefined，返回默认值
  return result === undefined ? defaultValue : result;
}

/**
 * 检查对象是否包含指定路径的属性
 * 类似于 lodash.has
 */
export function has(obj: any, path: string | string[]): boolean {
  if (obj == null) return false;

  // 将路径字符串转换为数组
  const keys = Array.isArray(path) ? path : path.split('.');

  let current = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    // 如果当前对象不是一个对象或者不包含该键，返回 false
    if ((!isObject(current) && !Array.isArray(current)) || !(key in current)) {
      return false;
    }

    current = current[key];
  }

  return true;
}
