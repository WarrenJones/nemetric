"use strict";
const path = require("path");

module.exports = {
  entry: { 
    'index_pc': './demo/js/index_pc.ts',
    'index_mobile': './demo/js/index_mobile.ts',
  },
  output: {
    filename: '[name].js', 
    path: path.resolve(__dirname, 'demo/js'), 
  },
  module: { 
    rules: [
      {
        test: /\.ts$/,
        loaders: ["babel-loader", "awesome-typescript-loader"],
        exclude: /node_modules/
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"]
  }
};