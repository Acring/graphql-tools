import { buildSchema } from 'graphql';
import { createMockStore, MockStore } from '../src/index.js';
import { assertIsRef, Ref } from '../src/types.js';
import { makeRef } from '../src/utils.js';

const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    age: Int!
    name: String!
    surnames: [String!]!
    listOfList: [[String]]!

    friends: [User!]!

    sex: Sex

    image: UserImage!
  }

  union UserImage = UserImageSolidColor | UserImageURL

  type UserImageSolidColor {
    id: ID!
    color: String!
  }

  type UserImageURL {
    id: ID!
    url: String!
  }

  enum Sex {
    Male
    Female
    Other
  }

  interface Book {
    id: ID!
    title: String
  }

  type TextBook implements Book {
    id: ID!
    title: String
    text: String
  }

  type ColoringBook implements Book {
    id: ID!
    title: String
    colors: [String]
  }

  type Query {
    viewer: User!
    userById(id: ID!): User!
    bookById(id: ID!): Book!
  }
`;

const schema = buildSchema(typeDefs);

describe('MockStore', () => {
  it('should generate a value properly without provided mocks', () => {
    const store = createMockStore({ schema });
    expect(store.get('User', '123', 'name')).toEqual('Hello World');
  });

  it('should generate a value properly without provided mocks (enum)', () => {
    const store = createMockStore({ schema });
    const value = store.get('User', '123', 'sex') as string;
    expect(['Male', 'Female', 'Other'].indexOf(value)).not.toEqual(-1);
  });

  it('should generate an id that matches key', () => {
    const store = createMockStore({ schema });
    store.get('User', '123', 'name');

    expect(store.get('User', '123', 'id')).toEqual('123');
  });

  it('should return the same value when called multiple times', () => {
    const store = createMockStore({ schema });
    expect(store.get('User', '123', 'age')).toEqual(store.get('User', '123', 'age'));
  });

  it('should return the same value when called multiple times with same args', () => {
    const store = createMockStore({ schema });
    const user1 = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'userById',
      fieldArgs: { id: '1' },
    });

    assertIsRef(user1);

    const user1Bis = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'userById',
      fieldArgs: { id: '1' },
    });

    assertIsRef(user1Bis);

    expect(user1.$ref).toEqual(user1Bis.$ref);
  });

  it('should treat empty object args the same as no arg', () => {
    const store = createMockStore({ schema });
    const user1 = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'viewer',
      fieldArgs: {},
    });

    assertIsRef(user1);

    const user1Bis = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'viewer',
    });

    assertIsRef(user1Bis);

    expect(user1.$ref).toEqual(user1Bis.$ref);
  });

  it('should return a different value if called with different field args', () => {
    const store = createMockStore({ schema });
    const user1 = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'userById',
      fieldArgs: { id: '1' },
    });

    assertIsRef(user1);

    const user2 = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'userById',
      fieldArgs: { id: '2' },
    });

    assertIsRef(user2);

    expect(user1.$ref).not.toEqual(user2.$ref);
  });

  it('should return a ref when called with no `fieldName`', () => {
    const store = createMockStore({ schema });

    const user = store.get('User', '123');

    expect(user).toHaveProperty('$ref');
    assertIsRef(user);

    expect(user.$ref.key).toEqual('123');
  });

  it('should return a random ref when called with no `fieldName` nor `key`', () => {
    const store = createMockStore({ schema });

    const user = store.get('User');

    expect(user).toHaveProperty('$ref');
  });

  it('should support multiple `fieldnames` for ref traversal', () => {
    const store = createMockStore({ schema });

    const friends = store.get('Query', 'ROOT', ['viewer', 'friends']);

    expect(Array.isArray(friends)).toBeTruthy();
  });

  it('should support passing a ref as first argument', () => {
    const store = createMockStore({ schema });
    expect(store.get(makeRef('User', '123'), 'name')).toEqual('Hello World');
  });

  it('should respect provided mocks', () => {
    const store = createMockStore({
      schema,
      mocks: {
        User: {
          name: () => 'Superman',
        },
      },
    });
    expect(store.get('User', '123', 'name')).toEqual('Superman');
  });

  it('with type level mocks, it should produce consistent values', () => {
    const store = createMockStore({
      schema,
      mocks: {
        User: () => {
          const charCode = 65 + Math.round(Math.random() * 25);
          return {
            age: charCode,
            name: String.fromCharCode(charCode),
          };
        },
      },
    });

    const age = store.get('User', '123', 'age') as number;

    expect(store.get('User', '123', 'name')).toEqual(String.fromCharCode(age));
  });

  it('should support nested mocks', () => {
    const store = createMockStore({
      schema,
      mocks: {
        User: {
          friends: () => [{ age: 21 }, { age: 22 }],
        },
      },
    });

    const friendsRefs = store.get('User', '123', 'friends') as Ref[];
    expect(friendsRefs).toHaveLength(2);
    const friendsAges = friendsRefs.map(ref => store.get('User', ref.$ref.key, 'age')).sort();
    expect(friendsAges).toEqual([21, 22]);
  });

  it('should generate a ref when the field is a type', () => {
    const store = createMockStore({ schema });
    const value = store.get('Query', 'ROOT', 'viewer');
    expect(value).toHaveProperty('$ref');
  });

  it('should be able to generate a list of scalar types', () => {
    const store = createMockStore({ schema });
    const surnames = store.get('User', '123', 'surnames') as string[];

    expect(surnames).toBeInstanceOf(Array);
    expect(typeof surnames[0]).toBe('string');
  });

  it('should be able to generate a list of Object type', () => {
    const store = createMockStore({ schema });
    const friends = store.get('User', '123', 'friends') as any[];

    expect(friends).toBeInstanceOf(Array);
    expect(friends[0]).toHaveProperty('$ref');
  });

  it('should support multiple field set', () => {
    const store = createMockStore({ schema });

    store.set('User', 'me', {
      name: 'Alexandre',
      age: 31,
    });

    expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
  });

  it('should set with a ref', () => {
    const store = createMockStore({ schema });

    store.set(makeRef('User', 'me'), 'name', 'Alexandre');
    expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
  });

  it('should support nested set', () => {
    const store = createMockStore({ schema });

    store.set('Query', 'ROOT', 'viewer', {
      id: 'me',
      name: 'Alexandre',
      age: 31,
    });

    expect(store.get('Query', 'ROOT', 'viewer')).toEqual({ $ref: { key: 'me', typeName: 'User' } });
    expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
  });

  it('should support nested set with a ref', () => {
    const store = createMockStore({ schema });

    store.set(makeRef('User', 'me'), { name: 'Alexandre' });
    expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
  });

  it('nested set should not override ref', () => {
    const store = createMockStore({ schema });

    store.set('Query', 'ROOT', 'viewer', {
      id: 'me',
    });

    store.set('Query', 'ROOT', 'viewer', {
      name: 'Alexandre',
    });

    expect(store.get('Query', 'ROOT', 'viewer')).toEqual({ $ref: { key: 'me', typeName: 'User' } });
    expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
  });

  it('should support nested set with list', () => {
    const store = createMockStore({ schema });

    store.set('User', 'me', 'friends', [
      {
        name: 'Ross',
      },
      {
        name: 'Nico',
      },
      {
        name: 'Trev',
      },
    ]);

    const myFriendsRefs = store.get('User', 'me', 'friends') as Ref[];
    expect(myFriendsRefs).toHaveLength(3);

    const MyFriendsNames = myFriendsRefs.map(ref => store.get('User', ref.$ref.key, 'name')).sort();
    expect(MyFriendsNames).toEqual(['Nico', 'Ross', 'Trev']);
  });

  it('should support nested set with empty list of scalars', () => {
    const store = createMockStore({ schema });

    store.set('User', 'me', 'surnames', [...new Array(2)]);

    const mySurnames = store.get('User', 'me', 'surnames') as string[];
    expect(mySurnames).toHaveLength(2);

    expect(typeof mySurnames[0]).toBe('string');
  });

  it('should support nested set of lists of lists with empty list of scalars', () => {
    const store = createMockStore({ schema });

    store.set('User', 'me', 'listOfList', [
      [undefined, undefined],
      [undefined, undefined],
    ]);

    const myListOfList = store.get('User', 'me', 'listOfList') as string[][];
    expect(myListOfList).toHaveLength(2);
    expect(myListOfList[0]).toHaveLength(2);

    expect(typeof myListOfList[0][0]).toBe('string');
  });

  it('should support nested set with empty list of types', () => {
    const store = createMockStore({ schema });

    store.set('User', 'me', 'friends', [...new Array(2)]);

    const myFriendsRefs = store.get('User', 'me', 'friends') as Ref[];
    expect(myFriendsRefs).toHaveLength(2);

    // should return array of valid refs
    expect(myFriendsRefs[0]).toHaveProperty('$ref');
  });

  it('should support ID of type number', () => {
    const typeDefs = /* GraphQL */ `
      type User {
        id: Int!
        name: String!
      }

      type Query {
        viewer: User!
        userById(id: Int!): User!
      }
    `;

    const schema = buildSchema(typeDefs);

    const store = createMockStore({ schema });
    const user = store.get('Query', 'ROOT', 'viewer') as Ref<number>;
    expect(typeof user.$ref.key).toBe('number');
  });

  describe('has method', () => {
    it('should return true if a mocked value has been generated via get', () => {
      const store = createMockStore({ schema });

      expect(store.has('User', 'user-1')).toBe(false);

      store.get('User', 'user-1', {
        name: 'User 1',
      });

      expect(store.has('User', 'user-1')).toBe(true);
    });

    it('should return true if a mocked value has been generated via get without data', () => {
      const store = createMockStore({ schema });

      expect(store.has('User', 'user-1')).toBe(false);
      expect(store.has('User', 'user-2')).toBe(false);

      store.get('User', 'user-1');
      store.get('User', 'user-2', {});

      expect(store.has('User', 'user-1')).toBe(true);
      expect(store.has('User', 'user-2')).toBe(true);
    });

    it('should return true if a mocked value was generated using nested get', () => {
      const store = createMockStore({ schema });

      expect(store.has('UserImageURL', 'user-image-1')).toBe(false);

      store.get('User', 'user-1', {
        image: {
          __typename: 'UserImageURL',
          id: 'user-image-1',
        },
      });

      expect(store.has('UserImageURL', 'user-image-1')).toBe(true);
    });

    it('should return true if a mocked value has been set', () => {
      const store = createMockStore({ schema });

      expect(store.has('User', 'user-1')).toBe(false);

      store.set('User', 'user-1', {
        name: 'User 1',
      });

      expect(store.has('User', 'user-1')).toBe(true);
    });

    it('should return true if a mocked value has been set without data', () => {
      const store = createMockStore({ schema });

      expect(store.has('User', 'user-1')).toBe(false);

      store.set('User', 'user-1', {});

      expect(store.has('User', 'user-1')).toBe(true);
    });

    it('should return true if a mocked value was generated using nested set', () => {
      const store = createMockStore({ schema });

      expect(store.has('UserImageURL', 'user-image-1')).toBe(false);

      store.set('User', 'user-1', {
        image: {
          __typename: 'UserImageURL',
          id: 'user-image-1',
        },
      });

      expect(store.has('UserImageURL', 'user-image-1')).toBe(true);
    });
  });

  describe('default values', () => {
    it('should be inserted when called with no key', () => {
      const store = createMockStore({ schema });

      const alexRef = store.get('User', { name: 'Alexandre' }) as Ref;

      expect(store.get('User', alexRef.$ref.key, 'name')).toEqual('Alexandre');
    });

    it('should be inserted when called with a key', () => {
      const store = createMockStore({ schema });

      store.get('User', 'me', { name: 'Alexandre' }) as Ref;

      expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
    });

    it('should not override', () => {
      const store = createMockStore({ schema });

      store.set('User', 'me', 'name', 'Alexandre');
      store.get('User', 'me', { name: 'Matthias' }) as Ref;

      expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
    });

    describe('union types', () => {
      it('should work without mocks', () => {
        const store = createMockStore({ schema });

        const imageRef = store.get('User', 'me', 'image') as Ref;

        expect(
          ['UserImageSolidColor', 'UserImageURL'].includes(imageRef.$ref.typeName),
        ).toBeTruthy();
      });

      it('should work with mocks', () => {
        const store = createMockStore({
          schema,
          mocks: {
            UserImage: () => {
              return {
                __typename: 'UserImageSolidColor',
                color: 'white',
              };
            },
          },
        });

        const imageRef = store.get('User', 'me', 'image') as Ref;

        expect(imageRef.$ref.typeName).toEqual('UserImageSolidColor');
        expect(store.get(imageRef, 'color')).toEqual('white');
      });

      it('should work with mocks setting the id', () => {
        const store = createMockStore({
          schema,
          mocks: {
            UserImage: () => {
              return {
                id: 'UserImageSolidColor:1234',
                __typename: 'UserImageSolidColor',
              };
            },
          },
        });

        const imageRef = store.get('User', 'me', 'image') as Ref;

        expect(imageRef.$ref.typeName).toEqual('UserImageSolidColor');
        expect(store.get(imageRef, 'id')).toEqual('UserImageSolidColor:1234');
      });

      it('should let nested sets', () => {
        const store = createMockStore({ schema });

        store.set('User', 'me', {
          image: {
            __typename: 'UserImageSolidColor',
            color: 'white',
          },
        });
        const imageRef = store.get('User', 'me', 'image') as Ref;

        expect(imageRef.$ref.typeName).toEqual('UserImageSolidColor');
        expect(store.get(imageRef, 'color')).toEqual('white');
      });
    });

    describe('interface types', () => {
      it('should work without mocks', () => {
        const store = createMockStore({ schema });

        const bookRef = store.get('Query', 'ROOT', 'bookById') as Ref;

        expect(['TextBook', 'ColoringBook'].includes(bookRef.$ref.typeName)).toBeTruthy();
      });

      it('should work with mocks', () => {
        const store = createMockStore({
          schema,
          mocks: {
            Book: () => {
              return {
                __typename: 'TextBook',
                text: 'long text',
              };
            },
          },
        });

        const bookRef = store.get('Query', 'ROOT', 'bookById') as Ref;

        expect(bookRef.$ref.typeName).toEqual('TextBook');
        expect(store.get(bookRef, 'text')).toEqual('long text');
      });

      it('should let nested sets', () => {
        const store = createMockStore({ schema });

        store.set('Query', 'ROOT', {
          bookById: {
            __typename: 'TextBook',
            text: 'long text',
          },
        });
        const bookRef = store.get('Query', 'ROOT', 'bookById') as Ref;

        expect(bookRef.$ref.typeName).toEqual('TextBook');
        expect(store.get(bookRef, 'text')).toEqual('long text');
      });
    });
  });
  it('should reset the store', () => {
    const store = createMockStore({ schema });

    store.set(makeRef('User', 'me'), 'name', 'Alexandre');
    store.reset();
    expect(store.get('User', 'me', 'name')).not.toEqual('Alexandre');
  });

  it('should pass field args to value getter function', () => {
    const store = createMockStore({
      schema,
      mocks: {
        User: () => {
          return {
            name: ({ format }: { format: string }) =>
              format === 'fullName' ? 'Alexandre the Great' : 'Alex',
          };
        },
      },
    });

    expect(store.get('User', '123', 'name', { format: 'fullName' })).toEqual('Alexandre the Great');
    expect(store.get('User', '123', 'name', { format: 'shortName' })).toEqual('Alex');
  });

  describe('filter method', () => {
    it('should be able to filter an empty list', () => {
      const store = new MockStore({ schema });
      store.set('User', 'user1', { name: 'Ross' });
      expect(store.filter('User', () => false)).toEqual([]);
      store.reset();
      expect(store.filter('User', () => true)).toEqual([]);
    });

    it('should apply the filter', () => {
      const store = new MockStore({ schema });
      store.set('User', 'user1', { name: 'Ross' });
      store.set('User', 'user2', { name: 'Nico' });
      expect(store.filter('User', () => true)).toEqual([{ name: 'Ross' }, { name: 'Nico' }]);
      expect(store.filter('User', ({ name }) => (name as string).startsWith('R'))).toEqual([
        { name: 'Ross' },
      ]);
    });
  });

  describe('find method', () => {
    it('should return undefined for an empty store', () => {
      const store = new MockStore({ schema });
      expect(store.find('User', () => true)).toBeUndefined();
    });

    it('should return undefined for a miss', () => {
      const store = new MockStore({ schema });
      store.set('User', 'user1', { name: 'Ross' });
      expect(store.find('User', () => false)).toBeUndefined();
    });

    it('should return a match', () => {
      const store = new MockStore({ schema });
      store.set('User', 'user1', { name: 'Ross' });
      store.set('User', 'user2', { name: 'Nico' });
      expect(store.find('User', ({ name }) => (name as string).startsWith('N'))).toEqual({
        name: 'Nico',
      });
    });
  });

  describe('nested path keyFieldName', () => {
    const typeDefs = /* GraphQL */ `
      type Resource {
        spec: ResourceSpec!
        metadata: ResourceMetadata!
      }

      type ResourceSpec {
        id: ID!
        name: String!
      }

      type ResourceMetadata {
        createdAt: String!
      }

      type Query {
        getResource(id: ID!): Resource!
      }
    `;

    const schema = buildSchema(typeDefs);

    it('should support nested path keyFieldName', () => {
      const store = createMockStore({
        schema,
        typePolicies: {
          Resource: {
            keyFieldName: 'spec.id',
          },
        },
      });

      // 使用嵌套路径设置资源
      store.set('Resource', 'resource-1', {
        spec: {
          id: 'resource-1',
          name: '测试资源',
        },
        metadata: {
          createdAt: '2023-01-01',
        },
      });

      // 验证可以通过键获取资源
      expect(store.has('Resource', 'resource-1')).toBe(true);

      // 验证嵌套路径中的键值已正确设置
      const resourceSpec = store.get('Resource', 'resource-1', 'spec') as Ref;
      expect(store.get(resourceSpec, 'id')).toBe('resource-1');
      expect(store.get(resourceSpec, 'name')).toBe('测试资源');
    });

    it('should prevent setting nested key fields that do not match the key', () => {
      const store = createMockStore({
        schema,
        typePolicies: {
          Resource: {
            keyFieldName: 'spec.id',
          },
        },
      });

      // 尝试设置与键不匹配的嵌套键字段应该抛出错误
      expect(() => {
        store.set('Resource', 'resource-1', {
          spec: {
            id: 'wrong-id', // 与资源键不匹配
            name: '测试资源',
          },
        });
      }).toThrow();
    });

    it('should support multi-level nested paths', () => {
      const nestedTypeDefs = /* GraphQL */ `
        type DeepResource {
          metadata: DeepMetadata!
        }

        type DeepMetadata {
          spec: DeepSpec!
        }

        type DeepSpec {
          data: DeepData!
        }

        type DeepData {
          id: ID!
          value: String!
        }
      `;

      const nestedSchema = buildSchema(nestedTypeDefs);

      const store = createMockStore({
        schema: nestedSchema,
        typePolicies: {
          DeepResource: {
            keyFieldName: 'metadata.spec.data.id',
          },
        },
      });

      // 设置具有深度嵌套路径的资源
      store.set('DeepResource', 'deep-id', {
        metadata: {
          spec: {
            data: {
              id: 'deep-id',
              value: '深度嵌套值',
            },
          },
        },
      });

      // 验证可以通过键获取资源
      expect(store.has('DeepResource', 'deep-id')).toBe(true);

      const metadata = store.get('DeepResource', 'deep-id', 'metadata') as Ref;
      expect(store.get(metadata, ['spec', 'data', 'id'])).toBe('deep-id');
      expect(store.get(metadata, ['spec', 'data', 'value'])).toBe('深度嵌套值');
    });
  });
});
