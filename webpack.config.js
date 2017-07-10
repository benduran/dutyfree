
const path = require('path');

const
    {UglifyJsPlugin} = require('webpack').optimize,
    autoprefixer = require('autoprefixer');

module.exports = function (env = {}) {
    const {
        production = false,
    } = env;
    const plugins = [];
    if (production) {
        plugins.push(new UglifyJsPlugin({
            compress: true,
            mangle: true,
            comments: false,
        }));
    }
    return {
        entry: path.resolve('./client/index.js'),
        output: {
            path: path.resolve('./dist'),
            filename: 'dutyfree.client.js',
            library: 'dutyFree',
            libraryTarget: 'umd',
        },
        module: {
            rules: [{
                test: /\.(jsx|js)$/,
                exclude: /(node_modules)/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ['latest', 'stage-1', 'react'],
                    },
                }],
            }, {
                test: /\.(styl|css)$/,
                use: [
                    'style-loader',
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins: () => {
                                return [
                                    autoprefixer({
                                        browsers: ['last 2 versions'],
                                    }),
                                ];
                            },
                        },
                    },
                    'stylus-loader',
                ],
            }],
        },
        resolve: {
            extensions: ['.jsx', '.js', '.styl'],
        },
        devServer: {
            contentBase: path.resolve('./pages'),
            port: 4000,
            inline: true,
            overlay: true,
            proxy: {
                '/api': {
                    target: 'http://localhost',
                    secure: false,
                },
            },
        },
        plugins,
    };
};
