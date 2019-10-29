const path = require('path');

module.exports = {
	mode: 'production',
	entry: './src/module.js',
	// externals: 'lodash',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'umd.kim-three.min.js',
		library: 'kim-three',
		libraryTarget: 'umd'
	}
}