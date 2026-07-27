module.exports = {
  testRegex: '.*\\.spec\\.ts$',
  // src/ imports carry .js extensions so the ESM build emits valid specifiers;
  // map them back to the .ts sources jest actually resolves.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          target: 'ES2021',
          skipLibCheck: true,
          esModuleInterop: true,
          types: ['jest', 'node'],
        },
      },
    ],
  },
  testEnvironment: 'node',
};
