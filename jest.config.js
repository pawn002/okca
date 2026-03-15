module.exports = {
  testRegex: '.*\\.spec\\.ts$',
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
