module.exports = {
	rules: {
		// Allow custom default value for limit parameter (we use 10 instead of n8n's standard 50)
		'n8n-nodes-base/node-param-default-wrong-for-limit': 'off',
	},
};
