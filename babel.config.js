module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Metro web puede ejecutar el bundle como script; sin esto, paquetes ESM con `import.meta`
          // rompen en runtime ("Cannot use import.meta outside a module").
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
